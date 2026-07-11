package com.bcits.works;

import com.bcits.works.shared.ApiException;
import com.bcits.works.workitems.WorkItemBulkService;

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
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Integration tests for {@link WorkItemBulkService} against real Postgres. The mandatory governance
 * scenarios (RB-05 Stage 3) are the point of this suite: a bulk edit must re-check edit rights per
 * item ({@code unauthorized}) and must never touch another tenant's items ({@code cross-tenant}),
 * while auditing every change it does apply.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class WorkItemBulkActionIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    WorkItemBulkService bulk;

    private static final String WS_A = "BULK-WS-A";
    private static final String WS_B = "BULK-WS-B";
    private static final String PROJ_A = "BULK-PROJ-A";
    private static final String PROJ_B = "BULK-PROJ-B";
    private static final String ADMIN_A = "BULK-ADMIN-A";   // ADMIN in WS A â€” can edit any A item
    private static final String MEMBER_A = "BULK-MEMBER-A"; // MEMBER in WS A â€” can edit only own
    private static final String USER_B = "BULK-USR-B";

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("DELETE FROM tags WHERE work_item_id IN (SELECT id FROM work_items WHERE project_id IN (?, ?))",
            PROJ_A, PROJ_B);
        // The events table is append-only (RB-10 Â§3 â€” a trigger blocks DELETE), so it is never
        // cleaned between runs; audit assertions measure a delta around the action instead.
        jdbc.update("DELETE FROM work_items WHERE project_id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM projects WHERE id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspaces WHERE id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM users WHERE id IN (?, ?, ?)", ADMIN_A, MEMBER_A, USER_B);

        user(ADMIN_A, "bulk-admin-a@test.invalid", now);
        user(MEMBER_A, "bulk-member-a@test.invalid", now);
        user(USER_B, "bulk-b@test.invalid", now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "Bulk WS A", "bulk-ws-a", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "Bulk WS B", "bulk-ws-b", now, now);
        member(WS_A, ADMIN_A, "ADMIN");
        member(WS_A, MEMBER_A, "MEMBER");
        member(WS_B, USER_B, "ADMIN");
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_A, WS_A, "Bulk Project A", "BLA", "bulk-proj-a", now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_B, WS_B, "Bulk Project B", "BLB", "bulk-proj-b", now);

        // WS A items; WS B item is the cross-tenant tripwire.
        item("BULK-A-1", "A one", "HIGH", PROJ_A, MEMBER_A);      // created by MEMBER_A
        item("BULK-A-2", "A two", "HIGH", PROJ_A, ADMIN_A);       // created by ADMIN_A (not MEMBER_A)
        item("BULK-B-1", "B one", "HIGH", PROJ_B, USER_B);
    }

    private void user(String id, String email, OffsetDateTime now) {
        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            id, email, "x", id, now);
    }

    private void member(String ws, String user, String role) {
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) VALUES (?,?,?,?)",
            ws, user, role, role);
    }

    private void item(String id, String title, String priority, String projectId, String createdBy) {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("INSERT INTO work_items(id, title, status, type, priority, project_id, "
            + "created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            id, title, "Todo", "TASK", priority, projectId, createdBy, now, now);
    }

    private String priorityOf(String id) {
        return jdbc.queryForObject("SELECT priority FROM work_items WHERE id = ?", String.class, id);
    }

    @Test
    void adminBulkPriority_appliesToOwnTenant_skipsCrossTenant() {
        WorkItemBulkService.BulkResult r =
            bulk.apply(ADMIN_A, List.of("BULK-A-1", "BULK-A-2", "BULK-B-1"), "priority", "LOW");

        assertThat(r.updated()).containsExactlyInAnyOrder("BULK-A-1", "BULK-A-2");
        assertThat(r.skipped()).hasSize(1);
        assertThat(r.skipped().get(0)).containsEntry("id", "BULK-B-1").containsEntry("reason", "forbidden");
        // The cross-tenant item is untouched; the in-tenant ones changed.
        assertThat(priorityOf("BULK-B-1")).isEqualTo("HIGH");
        assertThat(priorityOf("BULK-A-1")).isEqualTo("LOW");
    }

    @Test
    void bulkChange_isAudited() {
        String countSql = "SELECT COUNT(*) FROM events WHERE aggregate_id = ? AND field_name = 'priority' "
            + "AND old_value = 'HIGH' AND new_value = 'LOW'";
        // events is append-only; measure the delta this action adds rather than assuming a clean table.
        Integer before = jdbc.queryForObject(countSql, Integer.class, "BULK-A-1");
        bulk.apply(ADMIN_A, List.of("BULK-A-1"), "priority", "LOW");
        Integer after = jdbc.queryForObject(countSql, Integer.class, "BULK-A-1");
        assertThat(after - before).isEqualTo(1);
    }

    @Test
    void memberBulkEdit_onlyTouchesOwnItems() {
        // MEMBER_A created A-1 but not A-2 â†’ A-2 must be skipped (edit-own-only).
        WorkItemBulkService.BulkResult r =
            bulk.apply(MEMBER_A, List.of("BULK-A-1", "BULK-A-2"), "priority", "LOW");

        assertThat(r.updated()).containsExactly("BULK-A-1");
        assertThat(r.skipped()).hasSize(1);
        assertThat(r.skipped().get(0)).containsEntry("id", "BULK-A-2").containsEntry("reason", "forbidden");
        assertThat(priorityOf("BULK-A-2")).isEqualTo("HIGH");
    }

    @Test
    void addAndRemoveLabel_mutatesTagsAndAudits() {
        bulk.apply(ADMIN_A, List.of("BULK-A-1"), "addLabel", "urgent");
        Integer present = jdbc.queryForObject(
            "SELECT COUNT(*) FROM tags WHERE work_item_id = ? AND tag = ?", Integer.class, "BULK-A-1", "urgent");
        assertThat(present).isEqualTo(1);

        bulk.apply(ADMIN_A, List.of("BULK-A-1"), "removeLabel", "urgent");
        Integer afterRemove = jdbc.queryForObject(
            "SELECT COUNT(*) FROM tags WHERE work_item_id = ? AND tag = ?", Integer.class, "BULK-A-1", "urgent");
        assertThat(afterRemove).isEqualTo(0);
    }

    @Test
    void unknownAction_isRejected() {
        assertThrows(ApiException.class,
            () -> bulk.apply(ADMIN_A, List.of("BULK-A-1"), "deleteEverything", "x"));
    }

    @Test
    void missingId_isSkippedNotFatal() {
        WorkItemBulkService.BulkResult r =
            bulk.apply(ADMIN_A, List.of("BULK-DOES-NOT-EXIST"), "priority", "LOW");
        assertThat(r.updated()).isEmpty();
        assertThat(r.skipped().get(0)).containsEntry("reason", "not_found");
    }
}
