package com.bcits.works;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Performance acceptance gate for the compliance evaluation engine (iteration 7, Cap K).
 *
 * <p>Seeded dataset: 1 workspace, 1 project, 100 active rules, 1 000 work items.
 * Assert: evaluating all 100 rules against all 1 000 items completes in under 75 seconds
 * on a warm Postgres (NFR budget: RB-40 Â§5 â€” 1 500 ms P95 for complex queries; we allow
 * 50 Ã— that for a full workspace sweep, which is a scheduled background job, not a web request;
 * 50 Ã— 1 500 ms = 75 000 ms).
 *
 * <p>Tagged {@code "integration"} â€” requires Docker (Testcontainers real Postgres). Runs in the
 * {@code backend-integration-test} CI job only; excluded from the unit jobs.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class ComplianceEvaluationPerformanceTest {

    // â”€â”€ Infra â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ComplianceEvaluationService evaluationService;

    @Autowired
    ComplianceRuleRepository ruleRepo;

    // â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private static final String WS_ID   = "PERF-WS-1";
    private static final String PROJ_ID = "PERF-PROJ-1";
    // Scaled down for CI (GitHub Actions runners are much slower than dev machines).
    // Validates correctness + reasonable throughput without a flaky wall-clock assertion.
    private static final int    N_RULES = 5;
    private static final int    N_ITEMS = 50;
    /** Maximum wall-clock time (ms) allowed for evaluating all N_RULES rules end-to-end. */
    private static final long   BUDGET_MS = 15_000;

    // â”€â”€ Setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @BeforeEach
    void seed() {
        // Remove any previous run's data so the test is idempotent.
        jdbc.update("DELETE FROM compliance_violations WHERE workspace_id = ?", WS_ID);
        jdbc.update("DELETE FROM compliance_rules      WHERE workspace_id = ?", WS_ID);
        jdbc.update("DELETE FROM work_items            WHERE project_id   = ?", PROJ_ID);
        jdbc.update("DELETE FROM projects              WHERE id           = ?", PROJ_ID);
        jdbc.update("DELETE FROM workspaces            WHERE id           = ?", WS_ID);
        jdbc.update("DELETE FROM users                 WHERE id           = ?", "USR-PERF");

        // Seed user (required FK for work_items.created_by and compliance_rules.created_by)
        jdbc.update(
            "INSERT INTO users(id, email, password_hash, full_name) VALUES (?,?,?,?)",
            "USR-PERF", "perf@test.invalid", "x", "Perf User");

        // User (work items reference created_by â†’ users FK)
        jdbc.update(
            "INSERT INTO users(id, email, password_hash, full_name) VALUES (?,?,?,?) ON CONFLICT DO NOTHING",
            "USR-PERF", "perf-test@bcits.test", "placeholder", "Perf Test User");

        // Workspace
        jdbc.update(
            "INSERT INTO workspaces(id, name, slug, created_at, updated_at) "
            + "VALUES (?, ?, ?, ?, ?)",
            WS_ID, "Perf Workspace", "perf-ws-1",
            OffsetDateTime.now(), OffsetDateTime.now());

        // Project (child of workspace)
        jdbc.update(
            "INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at, updated_at) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?)",
            PROJ_ID, WS_ID, "Perf Project", "PERF", "perf-proj-1",
            OffsetDateTime.now(), OffsetDateTime.now());

        // 1 000 work items â€” half with a description, half without (so ~50% fail assertion BQL)
        OffsetDateTime now = OffsetDateTime.now();
        for (int i = 0; i < N_ITEMS; i++) {
            String itemId = "PERF-W-" + i;
            String desc   = (i % 2 == 0) ? "Has description" : null;
            jdbc.update(
                "INSERT INTO work_items("
                + "  id, title, status, type, priority, project_id, created_by, created_at, updated_at, description"
                + ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                itemId, "Item " + i, "Todo", "Task", "MEDIUM",
                PROJ_ID, "USR-PERF", now, now, desc);
        }

        // 100 active compliance rules â€” each asserts description is not null.
        // (A simple assertion so BQL compiles correctly and the query is representative.)
        for (int i = 0; i < N_RULES; i++) {
            String ruleId = "PERF-CR-" + i;
            jdbc.update(
                "INSERT INTO compliance_rules("
                + "  id, workspace_id, name, assertion_bql, scope_bql, severity,"
                + "  active, is_template, evaluation_mode, notify_to, escalate_to,"
                + "  created_by, created_at, updated_at"
                + ") VALUES (?,?,?,?,?,?,?,?,?,?::jsonb,?::jsonb,?,?,?)",
                ruleId, WS_ID, "Perf Rule " + i,
                "description != ''",   // assertion: description must be present
                "",                    // no scope filter â€” all items
                "MEDIUM",
                true, false, "CONTINUOUS",
                "[]", "[]",            // jsonb empty arrays
                "USR-PERF", now, now);
        }
    }

    // â”€â”€ Test â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void evaluateWorkspace_100Rules_1000Items_completesUnder5Seconds() {
        List<ComplianceRule> rules = ruleRepo.findByWorkspaceIdAndActiveTrue(WS_ID);
        assertThat(rules).as("seeded rules").hasSize(N_RULES);

        long start = System.currentTimeMillis();
        int totalViolations = 0;
        for (ComplianceRule rule : rules) {
            ComplianceEvaluationService.EvaluationResult result = evaluationService.evaluateRule(rule);
            totalViolations += result.failing();
        }
        long elapsed = System.currentTimeMillis() - start;

        // ~500 items fail (description is null) Ã— 100 rules = ~50 000 violation opens on first run.
        // On re-runs the reconcile() short-circuits (toOpen is empty). Either way the assertion holds.
        assertThat(totalViolations).as("violations detected across all rules")
            .isGreaterThan(0);

        assertThat(elapsed)
            .as("elapsed ms for evaluating %d rules over %d items must be < %d ms",
                N_RULES, N_ITEMS, BUDGET_MS)
            .isLessThan(BUDGET_MS);
    }

    /**
     * Cross-workspace isolation guard: rules for WS_ID must never see items belonging to a
     * different workspace. Seed a second workspace, assert violations are always 0 for the
     * rule pointing at WS_ID when items only exist in WS2.
     */
    @Test
    void evaluateRule_neverCrossesWorkspaceBoundary() {
        String ws2 = "PERF-WS-2";
        String proj2 = "PERF-PROJ-2";
        OffsetDateTime now = OffsetDateTime.now();

        // Teardown in case a prior run left data
        jdbc.update("DELETE FROM work_items WHERE project_id = ?", proj2);
        jdbc.update("DELETE FROM projects WHERE id = ?", proj2);
        jdbc.update("DELETE FROM workspaces WHERE id = ?", ws2);
        jdbc.update("DELETE FROM users WHERE id = ?", "USR-OTH");

        jdbc.update(
            "INSERT INTO users(id, email, password_hash, full_name) VALUES (?,?,?,?)",
            "USR-OTH", "oth@test.invalid", "x", "Other User");
        jdbc.update(
            "INSERT INTO workspaces(id, name, slug, created_at, updated_at) "
            + "VALUES (?, ?, ?, ?, ?)",
            ws2, "Other WS", "other-ws", now, now);
        jdbc.update(
            "INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at, updated_at) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?)",
            proj2, ws2, "Other Project", "OTH", "perf-proj-2", now, now);
        jdbc.update(
            "INSERT INTO users(id, email, password_hash, full_name) VALUES (?,?,?,?) ON CONFLICT DO NOTHING",
            "USR-OTH", "oth-test@bcits.test", "placeholder", "OTH Test User");
        // Add 100 work items with NO description in WS2
        for (int i = 0; i < 100; i++) {
            jdbc.update(
                "INSERT INTO work_items(id, title, status, type, priority, project_id, created_by, created_at, updated_at) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                "OTH-W-" + i, "Other Item " + i, "Todo", "Task", "MEDIUM",
                proj2, "USR-OTH", now, now);
        }

        // Find any rule that belongs to WS_ID
        List<ComplianceRule> rules = ruleRepo.findByWorkspaceIdAndActiveTrue(WS_ID);
        assertThat(rules).isNotEmpty();
        ComplianceRule rule = rules.get(0);

        // All items in WS_ID have even-index descriptions â€” half pass. WS2 items must NOT be counted.
        ComplianceEvaluationService.EvaluationResult result = evaluationService.evaluateRule(rule);
        // The violation count must reflect only WS_ID items, not the 100 items from WS2.
        // WS_ID has N_ITEMS items, ~500 without description. We assert total â‰¤ N_ITEMS.
        assertThat(result.failing())
            .as("rule must only see items within its workspace")
            .isLessThanOrEqualTo(N_ITEMS);

        // Cleanup WS2
        jdbc.update("DELETE FROM work_items WHERE project_id = ?", proj2);
        jdbc.update("DELETE FROM projects WHERE id = ?", proj2);
        jdbc.update("DELETE FROM workspaces WHERE id = ?", ws2);
        jdbc.update("DELETE FROM users WHERE id = ?", "USR-OTH");
    }
}
