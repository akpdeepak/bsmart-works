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
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Integration tests for the saved-view run + audit path against real Postgres. Covers the mandatory
 * governance scenarios (RB-05 Stage 3): a saved view runs <b>workspace-scoped</b> (never sees
 * another tenant's matching rows), every run is <b>audited</b>, and the audit log read is
 * <b>admin-gated</b> ({@code unauthorized}).
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class BqlRunAuditIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    SavedViewService savedViews;

    private static final String WS_A = "AUDIT-WS-A";
    private static final String WS_B = "AUDIT-WS-B";
    private static final String PROJ_A = "AUDIT-PROJ-A";
    private static final String PROJ_B = "AUDIT-PROJ-B";
    private static final String ADMIN_A = "AUDIT-ADMIN-A";  // ADMIN in WS A
    private static final String VIEWER_A = "AUDIT-VIEWER-A"; // VIEWER in WS A (no manage_projects)
    private static final String VIEW_ID = "AUDIT-VIEW-1";

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("DELETE FROM bql_run_audits WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM saved_views WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM work_items WHERE project_id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM projects WHERE id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspaces WHERE id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM users WHERE id IN (?, ?)", ADMIN_A, VIEWER_A);

        user(ADMIN_A, "audit-admin@test.invalid", now);
        user(VIEWER_A, "audit-viewer@test.invalid", now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "Audit WS A", "audit-ws-a", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "Audit WS B", "audit-ws-b", now, now);
        member(WS_A, ADMIN_A, "ADMIN");
        member(WS_A, VIEWER_A, "VIEWER");
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_A, WS_A, "Audit Project A", "AUA", "audit-proj-a", now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_B, WS_B, "Audit Project B", "AUB", "audit-proj-b", now);

        // Both workspaces have HIGH bugs; the view matches in both, so only the scope keeps them apart.
        item("AUDIT-A-1", "A high bug", "Bug", "HIGH", PROJ_A);
        item("AUDIT-B-1", "B high bug", "Bug", "HIGH", PROJ_B);
        item("AUDIT-B-2", "B high bug two", "Bug", "HIGH", PROJ_B);

        jdbc.update("INSERT INTO saved_views(id, workspace_id, name, bql_filter, column_keys, "
            + "is_shared, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            VIEW_ID, WS_A, "High bugs", "priority = HIGH AND type = Bug", "[]", true, ADMIN_A, now, now);
    }

    private void user(String id, String email, OffsetDateTime now) {
        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            id, email, "x", id, now);
    }

    private void member(String ws, String user, String role) {
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) VALUES (?,?,?,?)",
            ws, user, role, role);
    }

    private void item(String id, String title, String type, String priority, String projectId) {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("INSERT INTO work_items(id, title, status, type, priority, project_id, "
            + "created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            id, title, "Open", type, priority, projectId, ADMIN_A, now, now);
    }

    @Test
    void run_returnsOnlyOwnTenantRows() {
        List<Map<String, Object>> rows = savedViews.run(ADMIN_A, WS_A, VIEW_ID, 100);
        assertThat(rows).extracting(r -> r.get("id")).containsExactly("AUDIT-A-1");
    }

    @Test
    void run_recordsAnAuditRowWithMatchCount() {
        savedViews.run(ADMIN_A, WS_A, VIEW_ID, 100);
        Map<String, Object> audit = jdbc.queryForMap(
            "SELECT source, source_id, user_id, result_count FROM bql_run_audits WHERE workspace_id = ?", WS_A);
        assertThat(audit).containsEntry("source", "SAVED_VIEW")
            .containsEntry("source_id", VIEW_ID)
            .containsEntry("user_id", ADMIN_A);
        assertThat(((Number) audit.get("result_count")).intValue()).isEqualTo(1);
    }

    @Test
    void auditLog_requiresManageProjects() {
        savedViews.run(ADMIN_A, WS_A, VIEW_ID, 100);
        // ADMIN can read the log; it reflects the run above.
        assertThat(savedViews.auditLog(ADMIN_A, WS_A, 50)).hasSize(1);
        // A VIEWER lacks manage_projects → forbidden.
        assertThrows(ApiException.class, () -> savedViews.auditLog(VIEWER_A, WS_A, 50));
    }
}
