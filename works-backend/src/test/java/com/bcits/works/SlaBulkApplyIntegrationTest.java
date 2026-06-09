package com.bcits.works;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration acceptance tests for bulk SLA policy application (iteration 8, Cap M).
 *
 * <p>Three scenario groups:
 * <ol>
 *   <li><b>Preview mode</b> — {@code SlaEvaluationService#preview()} returns the count and a sample
 *       of affected items without mutating any clock state.</li>
 *   <li><b>Confirm / apply mode</b> — {@code SlaEvaluationService#applyNow()} starts one
 *       {@link SlaInstance} per item per target; idempotent on re-run.</li>
 *   <li><b>Cross-workspace isolation</b> — items belonging to a second workspace are never
 *       touched by a policy scoped to the first workspace (RB-40 §1).</li>
 * </ol>
 *
 * <p>Tagged {@code "integration"} — requires Docker (Testcontainers real Postgres).
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class SlaBulkApplyIntegrationTest {

    // ── Infra ────────────────────────────────────────────────────────────────────

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    SlaEvaluationService evaluationService;

    @Autowired
    SlaPolicyRepository policyRepo;

    @Autowired
    SlaTargetRepository targetRepo;

    @Autowired
    SlaInstanceRepository instanceRepo;

    // ── Constants ────────────────────────────────────────────────────────────────

    private static final String WS_ID   = "SLA-WS-1";
    private static final String PROJ_ID = "SLA-PROJ-1";
    private static final String POL_ID  = "SLA-POL-1";
    private static final String TGT_ID  = "SLA-TGT-1";
    /** 20 work items in WS_ID. */
    private static final int    N_ITEMS = 20;
    /** Resolution target: 8 hours = 480 minutes. */
    private static final int    TARGET_MINUTES = 480;

    // ── Setup ────────────────────────────────────────────────────────────────────

    @BeforeEach
    void seed() {
        // Clean-slate so tests are idempotent and order-independent.
        jdbc.update("DELETE FROM sla_instances  WHERE workspace_id = ?", WS_ID);
        jdbc.update("DELETE FROM sla_targets    WHERE workspace_id = ?", WS_ID);
        jdbc.update("DELETE FROM sla_policies   WHERE workspace_id = ?", WS_ID);
        jdbc.update("DELETE FROM work_items     WHERE project_id   = ?", PROJ_ID);
        jdbc.update("DELETE FROM projects       WHERE id           = ?", PROJ_ID);
        jdbc.update("DELETE FROM workspaces     WHERE id           = ?", WS_ID);

        OffsetDateTime now = OffsetDateTime.now();

        // Seed test user (ON CONFLICT DO NOTHING — may already exist from a prior run).
        jdbc.update(
            "INSERT INTO users(id, email, password_hash, full_name) VALUES (?,?,?,?)"
            + " ON CONFLICT DO NOTHING",
            "USR-SLA", "sla-test@bcits.test", "placeholder", "SLA Test User");

        // Workspace + project
        jdbc.update(
            "INSERT INTO workspaces(id, name, slug, created_at) VALUES (?,?,?,?)",
            WS_ID, "SLA Test WS", "sla-ws-1", now);
        jdbc.update(
            "INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_ID, WS_ID, "SLA Project", "SLA", "sla", now);

        // N_ITEMS work items — all status="Todo" so no start/stop triggers block clock creation.
        for (int i = 0; i < N_ITEMS; i++) {
            jdbc.update(
                "INSERT INTO work_items("
                + "  id, title, status, type, priority, project_id, created_by, created_at, updated_at"
                + ") VALUES (?,?,?,?,?,?,?,?,?)",
                "SLA-W-" + i, "Item " + i, "Todo", "Task", "MEDIUM",
                PROJ_ID, "USR-SLA", now, now);
        }

        // One active SLA policy — no scope filter (all items in workspace are in scope).
        jdbc.update(
            "INSERT INTO sla_policies("
            + "  id, workspace_id, name, scope_bql, active, created_by, created_at, updated_at"
            + ") VALUES (?,?,?,?,?,?,?,?)",
            POL_ID, WS_ID, "Resolution SLA", "", true, "USR-SLA", now, now);

        // One target: RESOLUTION within TARGET_MINUTES (no start/stop status so the clock starts immediately).
        jdbc.update(
            "INSERT INTO sla_targets("
            + "  id, policy_id, workspace_id, metric, target_minutes, pause_statuses, sort_order"
            + ") VALUES (?,?,?,?,?,?,?)",
            TGT_ID, POL_ID, WS_ID, "RESOLUTION", TARGET_MINUTES, "[]", 0);
    }

    // ── 1 · Preview mode ─────────────────────────────────────────────────────────

    @Test
    void preview_returnsAffectedItemCountAndSample_withoutStartingClocks() {
        SlaPolicy policy = policyRepo.findById(POL_ID).orElseThrow();

        Map<String, Object> result = evaluationService.preview(policy);

        // Structural contract
        assertThat(result).containsKey("valid");
        assertThat(result).containsKey("scoped");
        assertThat(result).containsKey("sample");

        // Valid BQL scope (empty = all items)
        assertThat(result.get("valid")).isEqualTo(true);

        // Count
        int scoped = (int) result.get("scoped");
        assertThat(scoped).isEqualTo(N_ITEMS);

        // Sample ≤ 10 items, each with id + title
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sample = (List<Map<String, Object>>) result.get("sample");
        assertThat(sample).hasSizeLessThanOrEqualTo(10);
        assertThat(sample).allSatisfy(entry -> {
            assertThat(entry).containsKey("id");
            assertThat(entry).containsKey("title");
        });

        // Preview must NOT create any SLA instances — it is read-only.
        long instanceCount = countInstances(WS_ID);
        assertThat(instanceCount)
            .as("preview must not persist any SLA clocks — it is read-only")
            .isZero();
    }

    @Test
    void preview_withInvalidBql_reportsInvalidWithoutThrowing() {
        // Overwrite scope_bql with invalid BQL to exercise the error branch.
        jdbc.update("UPDATE sla_policies SET scope_bql = ? WHERE id = ?",
            "$$NOT_VALID_BQL$$", POL_ID);
        SlaPolicy policy = policyRepo.findById(POL_ID).orElseThrow();

        // Must not throw — preview is defensive.
        Map<String, Object> result = evaluationService.preview(policy);

        assertThat(result.get("valid")).isEqualTo(false);
        assertThat(result).containsKey("error");
        assertThat(countInstances(WS_ID)).isZero();
    }

    // ── 2 · Confirm / apply mode ─────────────────────────────────────────────────

    @Test
    void applyNow_startsOneInstancePerItemPerTarget() {
        SlaPolicy policy = policyRepo.findById(POL_ID).orElseThrow();

        SlaEvaluationService.EvaluationResult result = evaluationService.applyNow(policy);

        // All items are in scope.
        assertThat(result.scoped()).isEqualTo(N_ITEMS);

        // One clock started per item (one target).
        assertThat(result.started()).isEqualTo(N_ITEMS);

        // No clocks were already live, so none were advanced.
        assertThat(result.advanced()).isZero();

        // Verify in the DB: N_ITEMS instances exist, all RUNNING.
        long running = jdbc.queryForObject(
            "SELECT COUNT(*) FROM sla_instances WHERE workspace_id = ? AND state = 'RUNNING'",
            Long.class, WS_ID);
        assertThat(running)
            .as("every item should have a RUNNING SLA clock")
            .isEqualTo(N_ITEMS);

        // Each instance should reference the correct policy, target, and target budget.
        long correctTarget = jdbc.queryForObject(
            "SELECT COUNT(*) FROM sla_instances "
            + "WHERE workspace_id = ? AND policy_id = ? AND target_id = ? AND target_minutes = ?",
            Long.class, WS_ID, POL_ID, TGT_ID, TARGET_MINUTES);
        assertThat(correctTarget).isEqualTo(N_ITEMS);
    }

    @Test
    void applyNow_isIdempotent_doesNotDuplicateClocks() {
        SlaPolicy policy = policyRepo.findById(POL_ID).orElseThrow();

        // First apply
        evaluationService.applyNow(policy);
        long after1st = countInstances(WS_ID);

        // Second apply — same policy, same items.
        SlaEvaluationService.EvaluationResult second = evaluationService.applyNow(policy);
        long after2nd = countInstances(WS_ID);

        assertThat(after2nd)
            .as("second apply must not create duplicate clocks")
            .isEqualTo(after1st);

        // On re-run: 0 new starts (instances already exist), ≥ 0 advances (clock tick).
        assertThat(second.started())
            .as("no new instances should be created on re-run")
            .isZero();
    }

    @Test
    void applyNow_inactivePolicyProducesZeroClocks() {
        // Mark the policy inactive — the engine must skip it.
        jdbc.update("UPDATE sla_policies SET active = FALSE WHERE id = ?", POL_ID);
        SlaPolicy policy = policyRepo.findById(POL_ID).orElseThrow();

        SlaEvaluationService.EvaluationResult result = evaluationService.applyNow(policy);

        assertThat(result.scoped()).isZero();
        assertThat(result.started()).isZero();
        assertThat(countInstances(WS_ID)).isZero();
    }

    // ── 3 · Cross-workspace isolation ────────────────────────────────────────────

    /**
     * A policy in WS_ID must never start clocks for items that belong to a different workspace.
     * Seed WS2 with 10 items; run applyNow for the WS_ID policy; assert no WS2 clocks appear.
     */
    @Test
    void applyNow_neverCrossesWorkspaceBoundary() {
        String ws2   = "SLA-WS-2";
        String proj2 = "SLA-PROJ-2";
        OffsetDateTime now = OffsetDateTime.now();

        // Teardown WS2 leftovers from a prior run.
        jdbc.update("DELETE FROM sla_instances WHERE workspace_id = ?", ws2);
        jdbc.update("DELETE FROM work_items    WHERE project_id   = ?", proj2);
        jdbc.update("DELETE FROM projects      WHERE id           = ?", proj2);
        jdbc.update("DELETE FROM workspaces    WHERE id           = ?", ws2);

        jdbc.update(
            "INSERT INTO users(id, email, password_hash, full_name) VALUES (?,?,?,?)"
            + " ON CONFLICT DO NOTHING",
            "USR-OTH", "oth-test@bcits.test", "placeholder", "OTH Test User");

        jdbc.update(
            "INSERT INTO workspaces(id, name, slug, created_at) VALUES (?,?,?,?)",
            ws2, "Other WS", "other-ws", now);
        jdbc.update(
            "INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            proj2, ws2, "Other Project", "OTH", "oth", now);
        for (int i = 0; i < 10; i++) {
            jdbc.update(
                "INSERT INTO work_items("
                + "  id, title, status, type, priority, project_id, created_by, created_at, updated_at"
                + ") VALUES (?,?,?,?,?,?,?,?,?)",
                "OTH-W-" + i, "Other Item " + i, "Todo", "Task", "MEDIUM",
                proj2, "USR-OTH", now, now);
        }

        // Apply the WS_ID policy.
        SlaPolicy policy = policyRepo.findById(POL_ID).orElseThrow();
        SlaEvaluationService.EvaluationResult result = evaluationService.applyNow(policy);

        // WS_ID clocks created correctly.
        assertThat(result.scoped()).isEqualTo(N_ITEMS);
        assertThat(result.started()).isEqualTo(N_ITEMS);

        // No clocks must exist for WS2 items — the policy must not leak across tenant boundaries.
        long ws2Instances = jdbc.queryForObject(
            "SELECT COUNT(*) FROM sla_instances WHERE workspace_id = ?",
            Long.class, ws2);
        assertThat(ws2Instances)
            .as("the SLA policy for WS_ID must not create clocks for items in WS2")
            .isZero();

        // Also verify via item IDs: no WS2 work items appear in sla_instances.
        long ws2ItemClocks = jdbc.queryForObject(
            "SELECT COUNT(*) FROM sla_instances si "
            + "JOIN work_items wi ON wi.id = si.work_item_id "
            + "WHERE wi.project_id = ?",
            Long.class, proj2);
        assertThat(ws2ItemClocks)
            .as("no SLA clock should reference any work item from WS2")
            .isZero();

        // Cleanup WS2
        jdbc.update("DELETE FROM sla_instances WHERE workspace_id = ?", ws2);
        jdbc.update("DELETE FROM work_items    WHERE project_id   = ?", proj2);
        jdbc.update("DELETE FROM projects      WHERE id           = ?", proj2);
        jdbc.update("DELETE FROM workspaces    WHERE id           = ?", ws2);
    }

    // ── helpers ───────────────────────────────────────────────────────────────────

    private long countInstances(String workspaceId) {
        Long count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM sla_instances WHERE workspace_id = ?",
            Long.class, workspaceId);
        return count == null ? 0L : count;
    }
}
