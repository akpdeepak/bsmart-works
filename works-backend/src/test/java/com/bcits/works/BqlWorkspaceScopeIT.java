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
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cross-tenant isolation IT for the BQL <b>query path</b> (RB-40 §1). Regression guard for the
 * former leak in {@code BqlController.execute()}, which queried {@code work_items} with no
 * {@code workspace_id} predicate and so returned every tenant's rows.
 *
 * <p>It composes the exact SQL the controller now builds — the workspace scope predicate plus the
 * {@link BqlCompiler} output — and asserts that a user filtering in workspace A can never see
 * workspace B's items, <b>even when the BQL filter would otherwise match B's rows</b>.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class BqlWorkspaceScopeIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    BqlCompiler compiler;

    private static final String WS_A   = "BQLSCOPE-WS-A";
    private static final String WS_B   = "BQLSCOPE-WS-B";
    private static final String PROJ_A = "BQLSCOPE-PROJ-A";
    private static final String PROJ_B = "BQLSCOPE-PROJ-B";
    private static final String USER_A = "BQLSCOPE-USR-A";
    private static final String USER_B = "BQLSCOPE-USR-B";

    // The scope predicate the controller prepends to every user query.
    private static final String SCOPE =
        "deleted_at IS NULL AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)";

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("DELETE FROM work_items WHERE project_id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM projects   WHERE id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspaces WHERE id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM users      WHERE id IN (?, ?)", USER_A, USER_B);

        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER_A, "bqlscope-a@test.invalid", "x", "Scope User A", now);
        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER_B, "bqlscope-b@test.invalid", "x", "Scope User B", now);

        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "Scope WS A", "bqlscope-ws-a", now, now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_A, WS_A, "Scope Project A", "BSA", "bqlscope-proj-a", now);

        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "Scope WS B", "bqlscope-ws-b", now, now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_B, WS_B, "Scope Project B", "BSB", "bqlscope-proj-b", now);

        // Both workspaces have HIGH-priority bugs — the BQL filter below matches in BOTH tenants,
        // so only the scope predicate can keep them apart.
        seedItem("BQLSCOPE-A-1", "A high bug", "Open", "Bug", "HIGH", PROJ_A, USER_A, now);
        seedItem("BQLSCOPE-A-2", "A low task", "Open", "Task", "LOW", PROJ_A, USER_A, now);
        seedItem("BQLSCOPE-B-1", "B high bug", "Open", "Bug", "HIGH", PROJ_B, USER_B, now);
        seedItem("BQLSCOPE-B-2", "B high bug two", "Open", "Bug", "HIGH", PROJ_B, USER_B, now);
    }

    private void seedItem(String id, String title, String status, String type, String priority,
                          String projectId, String createdBy, OffsetDateTime now) {
        jdbc.update("INSERT INTO work_items("
            + " id, title, status, type, priority, project_id, created_by, created_at, updated_at"
            + ") VALUES (?,?,?,?,?,?,?,?,?)",
            id, title, status, type, priority, projectId, createdBy, now, now);
    }

    /** Compose the controller's query for a given workspace + BQL and return the matched ids. */
    private List<String> runScoped(String workspaceId, String bql) {
        BqlCompiler.Compiled c = compiler.compileFor(bql, BqlContext.forUser("tester", false));
        String sql = "SELECT id FROM work_items WHERE " + SCOPE
            + (c.sql().isEmpty() ? "" : " AND (" + c.sql() + ")")
            + " ORDER BY id";
        List<Object> params = new ArrayList<>();
        params.add(workspaceId);
        params.addAll(c.params());
        return jdbc.queryForList(sql, String.class, params.toArray());
    }

    @Test
    void filterInWorkspaceA_returnsOnlyWorkspaceArows() {
        List<String> ids = runScoped(WS_A, "priority = HIGH AND type = Bug");
        assertThat(ids)
            .as("a HIGH-bug filter in WS A must only return WS A items, never WS B's matching rows")
            .containsExactly("BQLSCOPE-A-1");
    }

    @Test
    void sameFilterInWorkspaceB_returnsOnlyWorkspaceBrows() {
        List<String> ids = runScoped(WS_B, "priority = HIGH AND type = Bug");
        assertThat(ids).containsExactly("BQLSCOPE-B-1", "BQLSCOPE-B-2");
    }

    @Test
    void emptyFilter_isStillWorkspaceScoped() {
        List<String> ids = runScoped(WS_A, "");
        assertThat(ids)
            .as("an empty query must not fall through to all tenants")
            .containsExactly("BQLSCOPE-A-1", "BQLSCOPE-A-2");
    }

    @Test
    void newOperators_compileAndStayScoped() {
        // Exercises grouping + IN + IS NOT EMPTY against the live DB, all within WS A.
        List<String> ids = runScoped(WS_A,
            "(priority IN (HIGH, LOW)) AND assignee IS EMPTY AND status = Open");
        assertThat(ids).containsExactly("BQLSCOPE-A-1", "BQLSCOPE-A-2");
    }

    /** Compose the controller's /group query: count per group value, workspace-scoped. */
    private List<java.util.Map<String, Object>> runGrouped(String workspaceId, String groupCol, String bql) {
        BqlCompiler.Compiled c = compiler.compileFor(bql, BqlContext.forUser("tester", false));
        String sql = "SELECT COALESCE(" + groupCol + "::text, '') AS value, COUNT(*) AS count"
            + " FROM work_items WHERE " + SCOPE
            + (c.sql().isEmpty() ? "" : " AND (" + c.sql() + ")")
            + " GROUP BY " + groupCol + " ORDER BY count DESC, value ASC";
        List<Object> params = new ArrayList<>();
        params.add(workspaceId);
        params.addAll(c.params());
        return jdbc.queryForList(sql, params.toArray());
    }

    @Test
    void groupByType_countsPerBucket_andStaysScoped() {
        // WS B has two Bugs; WS A has one Bug + one Task. Grouping in A must not see B's bugs.
        List<java.util.Map<String, Object>> buckets = runGrouped(WS_A, "type", "");
        assertThat(buckets).hasSize(2);
        java.util.Map<String, Long> byValue = new java.util.HashMap<>();
        for (java.util.Map<String, Object> b : buckets) {
            byValue.put((String) b.get("value"), ((Number) b.get("count")).longValue());
        }
        assertThat(byValue).containsEntry("Bug", 1L).containsEntry("Task", 1L);
    }

    @Test
    void groupByWithFilter_appliesPredicateBeforeCounting() {
        List<java.util.Map<String, Object>> buckets = runGrouped(WS_B, "priority", "type = Bug");
        // Only B's two HIGH bugs survive the filter → a single HIGH bucket of 2.
        assertThat(buckets).hasSize(1);
        assertThat(buckets.get(0)).containsEntry("value", "HIGH");
        assertThat(((Number) buckets.get(0).get("count")).longValue()).isEqualTo(2L);
    }
}
