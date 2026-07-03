package com.bcits.works;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.BqlException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The multi-dimensional pivot engine against real Postgres. Covers the mandatory governance
 * scenarios (RB-05 Stage 3, RB-40 Â§1): cross-tenant denied, field-level security (a low tier cannot
 * pivot on a sensitive field), and injection-safety (a bogus dimension/measure is rejected, not
 * interpolated). Plus each aggregation, the 0/1/2/N-dimension shapes, the empty result, and the
 * dimension cap.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class PivotServiceIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired PivotService service;

    private static final String WS_A = "PV-WS-A";
    private static final String WS_B = "PV-WS-B";
    private static final String PROJ_A = "PV-PROJ-A";
    private static final String PROJ_B = "PV-PROJ-B";
    private static final String USER_MEMBER = "PV-USR-MEM"; // tier 2 â€” no sensitive fields
    private static final String USER_LEAD = "PV-USR-LEAD";  // tier 3 â€” sees sensitive fields
    private static final String USER_B = "PV-USR-B";        // member of WS B only

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("DELETE FROM work_items WHERE project_id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM projects WHERE id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspaces WHERE id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM users WHERE id IN (?, ?, ?)", USER_MEMBER, USER_LEAD, USER_B);

        user(USER_MEMBER, "pv-mem@test.invalid");
        user(USER_LEAD, "pv-lead@test.invalid");
        user(USER_B, "pv-b@test.invalid");
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "PV WS A", "pv-ws-a", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "PV WS B", "pv-ws-b", now, now);
        member(WS_A, USER_MEMBER, "MEMBER");
        member(WS_A, USER_LEAD, "LEAD");
        member(WS_B, USER_B, "MEMBER");
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) "
            + "VALUES (?,?,?,?,?,?)", PROJ_A, WS_A, "PV Project A", "PVA", "pva", now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) "
            + "VALUES (?,?,?,?,?,?)", PROJ_B, WS_B, "PV Project B", "PVB", "pvb", now);

        // WS A: known shape for aggregation maths.
        //  status   | priority | points | business_value
        //  Todo     | HIGH     | 3      | 8
        //  Todo     | LOW      | 5      | 2
        //  Done     | HIGH     | 8      | 10
        //  Done     | HIGH     | 2      | 4
        item("PVA-1", "Todo", "BUG", "HIGH", PROJ_A, 3, 8);
        item("PVA-2", "Todo", "STORY", "LOW", PROJ_A, 5, 2);
        item("PVA-3", "Done", "BUG", "HIGH", PROJ_A, 8, 10);
        item("PVA-4", "Done", "TASK", "HIGH", PROJ_A, 2, 4);
        // WS B: rows USER_MEMBER must never see through any pivot.
        for (int i = 1; i <= 6; i++) {
            item("PVB-" + i, "Todo", "BUG", "HIGH", PROJ_B, 1, 1);
        }
    }

    private void user(String id, String email) {
        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            id, email, "x", id, OffsetDateTime.now());
    }

    private void member(String ws, String user, String role) {
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) "
            + "VALUES (?,?,?,?)", ws, user, role, role);
    }

    private void item(String id, String status, String type, String priority, String projectId,
                      int points, int businessValue) {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("INSERT INTO work_items(id, title, status, type, priority, project_id, "
            + "story_points, business_value, created_by, created_at, updated_at) "
            + "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            id, id, status, type, priority, projectId, points, businessValue, USER_MEMBER, now, now);
    }

    private static PivotSpec spec(List<String> dims, PivotSpec.Measure... measures) {
        return new PivotSpec(null, List.of(measures), dims, null);
    }

    // â”€â”€ Dimension shapes 0/1/2/N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void zeroDimensions_returnsOneGrandTotalRow() {
        PivotService.PivotResult r = service.resolve(WS_A, USER_MEMBER,
            spec(List.of(), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)));
        assertThat(r.dimensions()).isEmpty();
        assertThat(r.rows()).hasSize(1);
        assertThat(((Number) r.rows().get(0).get("count_all")).longValue()).isEqualTo(4);
    }

    @Test
    void oneDimension_groupsByStatus() {
        PivotService.PivotResult r = service.resolve(WS_A, USER_MEMBER,
            spec(List.of("status"), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)));
        assertThat(r.dimensions()).containsExactly("status");
        Map<Object, Object> counts = new java.util.HashMap<>();
        r.rows().forEach(row -> counts.put(row.get("status"), ((Number) row.get("count_all")).longValue()));
        assertThat(counts).containsEntry("Todo", 2L).containsEntry("Done", 2L);
    }

    @Test
    void twoDimensions_groupByStatusAndPriority() {
        PivotService.PivotResult r = service.resolve(WS_A, USER_MEMBER,
            spec(List.of("status", "priority"), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)));
        assertThat(r.dimensions()).containsExactly("status", "priority");
        // Todo/HIGH=1, Todo/LOW=1, Done/HIGH=2 â†’ three rows.
        assertThat(r.rows()).hasSize(3);
    }

    @Test
    void nDimensions_threeDimensionsResolve() {
        PivotService.PivotResult r = service.resolve(WS_A, USER_MEMBER,
            spec(List.of("status", "priority", "type"), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)));
        assertThat(r.dimensions()).containsExactly("status", "priority", "type");
        assertThat(r.rows()).isNotEmpty();
    }

    // â”€â”€ Each aggregation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void aggregations_areCorrect() {
        PivotService.PivotResult r = service.resolve(WS_A, USER_MEMBER, spec(List.of(),
            new PivotSpec.Measure("*", PivotSpec.Agg.COUNT),
            new PivotSpec.Measure("storyPoints", PivotSpec.Agg.SUM),
            new PivotSpec.Measure("storyPoints", PivotSpec.Agg.AVG),
            new PivotSpec.Measure("storyPoints", PivotSpec.Agg.MIN),
            new PivotSpec.Measure("storyPoints", PivotSpec.Agg.MAX),
            new PivotSpec.Measure("priority", PivotSpec.Agg.COUNT_DISTINCT),
            new PivotSpec.Measure("storyPoints", PivotSpec.Agg.MEDIAN),
            new PivotSpec.Measure("storyPoints", PivotSpec.Agg.P85)));
        Map<String, Object> row = r.rows().get(0);
        assertThat(((Number) row.get("count_all")).longValue()).isEqualTo(4);
        assertThat(((Number) row.get("sum_storyPoints")).longValue()).isEqualTo(18); // 3+5+8+2
        assertThat(((Number) row.get("avg_storyPoints")).doubleValue()).isEqualTo(4.5);
        assertThat(((Number) row.get("min_storyPoints")).longValue()).isEqualTo(2);
        assertThat(((Number) row.get("max_storyPoints")).longValue()).isEqualTo(8);
        assertThat(((Number) row.get("count_distinct_priority")).longValue()).isEqualTo(2); // HIGH, LOW
        assertThat(((Number) row.get("median_storyPoints")).doubleValue()).isEqualTo(4.0); // 2,3,5,8
        assertThat(((Number) row.get("p85_storyPoints")).doubleValue()).isGreaterThan(5.0);
    }

    @Test
    void percentOfTotal_sharesSumToHundred() {
        PivotService.PivotResult r = service.resolve(WS_A, USER_MEMBER,
            spec(List.of("status"), new PivotSpec.Measure("*", PivotSpec.Agg.PERCENT_OF_TOTAL)));
        double total = r.rows().stream()
            .mapToDouble(row -> ((Number) row.get("percent_of_total_all")).doubleValue()).sum();
        assertThat(total).isEqualTo(100.0); // Todo 50% + Done 50%
    }

    // â”€â”€ Empty â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void emptyResult_whenFilterMatchesNothing() {
        PivotSpec s = new PivotSpec(null,
            List.of(new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)),
            List.of("status"), "type = \"NONEXISTENT\"");
        PivotService.PivotResult r = service.resolve(WS_A, USER_MEMBER, s);
        assertThat(r.rows()).isEmpty();
    }

    // â”€â”€ Cross-tenant (RB-40 Â§1 mandatory) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void crossTenant_nonMemberIsDenied_andScopingKeepsRowsApart() {
        // USER_MEMBER is not a member of WS B â†’ refused before any row is read.
        assertThatThrownBy(() -> service.resolve(WS_B, USER_MEMBER,
            spec(List.of(), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT))))
            .isInstanceOf(ApiException.class);

        // WS A's own count is 4 â€” never WS B's 6.
        PivotService.PivotResult a = service.resolve(WS_A, USER_MEMBER,
            spec(List.of(), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)));
        assertThat(((Number) a.rows().get(0).get("count_all")).longValue()).isEqualTo(4);

        // WS B's own member sees exactly WS B's 6 rows.
        PivotService.PivotResult b = service.resolve(WS_B, USER_B,
            spec(List.of(), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)));
        assertThat(((Number) b.rows().get(0).get("count_all")).longValue()).isEqualTo(6);
    }

    @Test
    void resolveForWorkspace_isWorkspaceScoped_withoutRbac_andHidesSensitiveFields() {
        // The unauthenticated public-embed path: no per-user RBAC gate, but the workspace predicate
        // is the entire scope â€” WS A's own count (4), never WS B's (6) (RB-40 Â§1).
        PivotService.PivotResult a = service.resolveForWorkspace(WS_A,
            spec(List.of(), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)));
        assertThat(((Number) a.rows().get(0).get("count_all")).longValue()).isEqualTo(4);

        PivotService.PivotResult b = service.resolveForWorkspace(WS_B,
            spec(List.of(), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)));
        assertThat(((Number) b.rows().get(0).get("count_all")).longValue()).isEqualTo(6);

        // A non-sensitive context: a leadership-only field is rejected, so a public viewer can never
        // see more than a non-privileged member would (field-level security still applies).
        assertThatThrownBy(() -> service.resolveForWorkspace(WS_A,
            spec(List.of(), new PivotSpec.Measure("businessValue", PivotSpec.Agg.SUM))))
            .isInstanceOf(BqlException.class);
    }

    // â”€â”€ Field-level security (RB-40 Â§1 mandatory) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void fieldSecurity_lowTierCannotPivotOnSensitiveField() {
        // businessValue is sensitive (LEAD+). A MEMBER referencing it as a measure is rejectedâ€¦
        assertThatThrownBy(() -> service.resolve(WS_A, USER_MEMBER,
            spec(List.of(), new PivotSpec.Measure("businessValue", PivotSpec.Agg.SUM))))
            .isInstanceOf(BqlException.class);
        // â€¦and as a dimension.
        assertThatThrownBy(() -> service.resolve(WS_A, USER_MEMBER,
            spec(List.of("businessValue"), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT))))
            .isInstanceOf(BqlException.class);

        // A LEAD (tier 3) may aggregate it: 8+2+10+4 = 24.
        PivotService.PivotResult r = service.resolve(WS_A, USER_LEAD,
            spec(List.of(), new PivotSpec.Measure("businessValue", PivotSpec.Agg.SUM)));
        assertThat(((Number) r.rows().get(0).get("sum_businessValue")).longValue()).isEqualTo(24);
    }

    // â”€â”€ Injection-safety (RB-40 Â§1 / RB-10 Â§6 mandatory) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void injectionSafety_bogusDimensionAndMeasureAreRejected() {
        // A column that is not in the allow-list, even a real one, is refused â€” never interpolated.
        assertThatThrownBy(() -> service.resolve(WS_A, USER_MEMBER,
            spec(List.of("deleted_at"), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT))))
            .isInstanceOf(BqlException.class);
        // A SQL-injection attempt as a dimension alias is rejected by the allow-list, not run.
        assertThatThrownBy(() -> service.resolve(WS_A, USER_MEMBER,
            spec(List.of("status); DROP TABLE work_items;--"),
                new PivotSpec.Measure("*", PivotSpec.Agg.COUNT))))
            .isInstanceOf(BqlException.class);
        // A bogus measure field is rejected too.
        assertThatThrownBy(() -> service.resolve(WS_A, USER_MEMBER,
            spec(List.of(), new PivotSpec.Measure("evil_column", PivotSpec.Agg.SUM))))
            .isInstanceOf(BqlException.class);
        // The table is intact.
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM work_items WHERE project_id = ?",
            Long.class, PROJ_A)).isEqualTo(4);
    }

    // â”€â”€ Limits / error cases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void dimensionCap_isEnforced() {
        assertThatThrownBy(() -> service.resolve(WS_A, USER_MEMBER,
            spec(List.of("status", "priority", "type", "assignee", "reporter"),
                new PivotSpec.Measure("*", PivotSpec.Agg.COUNT))))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo("TOO_MANY_DIMENSIONS"));
    }

    @Test
    void measureRequired_emptyMeasuresRejected() {
        PivotSpec s = new PivotSpec(null, List.of(), List.of("status"), null);
        assertThatThrownBy(() -> service.resolve(WS_A, USER_MEMBER, s))
            .isInstanceOf(ApiException.class);
    }

    @Test
    void batch_resolvesAll_andIsolatesAnInvalidSpec() {
        Map<String, PivotSpec> specs = new java.util.LinkedHashMap<>();
        specs.put("p1", spec(List.of("status"), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)));
        specs.put("p2", spec(List.of("nope_field"), new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)));
        List<PivotService.PivotBatchResult> out = service.batch(WS_A, USER_MEMBER, specs);
        assertThat(out).hasSize(2);
        Map<String, PivotService.PivotBatchResult> byId = new java.util.HashMap<>();
        out.forEach(b -> byId.put(b.id(), b));
        assertThat(byId.get("p1").data().rows()).isNotEmpty();
        assertThat(byId.get("p2").data()).isNull();
        assertThat(byId.get("p2").error()).isNotBlank();
    }

    @Test
    void sourceFilter_appliesThroughBql() {
        // A BQL source restricts the pivot the same way the explicit filters fragment would.
        WidgetSource src = new WidgetSource("bql", null, "status = \"Done\"", null, null, null, null);
        PivotSpec s = new PivotSpec(src,
            List.of(new PivotSpec.Measure("*", PivotSpec.Agg.COUNT)), List.of(), null);
        PivotService.PivotResult r = service.resolve(WS_A, USER_MEMBER, s);
        assertThat(((Number) r.rows().get(0).get("count_all")).longValue()).isEqualTo(2); // 2 Done
    }
}
