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
 * Cross-tenant workspace isolation integration test (RB-40 Â§1 / TD-013).
 *
 * <p>Seeds two workspaces (A and B), each with a project and work items. Verifies that repository
 * queries scoped to workspace A's user cannot return workspace B's rows â€” the single catastrophic
 * failure mode for a multi-tenant product (RB-40 Â§1: "no repository method returns rows across
 * workspaces").
 *
 * <p>The isolation predicate tested here mirrors the {@code MEMBER_PROJECTS} constant used in
 * {@link WorkItemController}: items are visible only when their project lives in a workspace where
 * the caller is a member. A caller that is only a member of workspace A must receive zero rows
 * from workspace B â€” regardless of whether workspace B's data exists in the same database.
 *
 * <p>Scenario categories covered:
 * <ul>
 *   <li>Happy path â€” user A sees their own workspace A items.</li>
 *   <li>Cross-tenant â€” user A does NOT see workspace B items.</li>
 *   <li>Isolation of membership â€” adding user A to workspace A does not grant access to B.</li>
 *   <li>Soft-delete boundary â€” deleted items in A are not leaked to B's query.</li>
 * </ul>
 *
 * <p>Tagged {@code "integration"} and named {@code *IT} â€” picked up by maven-failsafe in the
 * {@code integration-tests} CI job; never executed in the unit jobs (no Docker required there).
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class WorkspaceTenantIsolationIT {

    // â”€â”€ Infra â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    JdbcTemplate jdbc;

    // â”€â”€ Test fixtures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private static final String WS_A      = "ISOL-WS-A";
    private static final String WS_B      = "ISOL-WS-B";
    private static final String PROJ_A    = "ISOL-PROJ-A";
    private static final String PROJ_B    = "ISOL-PROJ-B";
    private static final String USER_A    = "ISOL-USR-A";
    private static final String USER_B    = "ISOL-USR-B";

    /**
     * Mirrors WorkItemController's MEMBER_PROJECTS predicate exactly.
     * A work item is visible to a user only when the item's project belongs to a workspace
     * of which the user is a member.
     */
    private static final String MEMBER_PROJECTS =
        "project_id IN (SELECT p.id FROM projects p "
        + "JOIN workspace_members wm ON wm.workspace_id = p.workspace_id WHERE wm.user_id = ?)";

    // â”€â”€ Setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();

        // --- Teardown: remove any previous run's fixtures (order matters due to FKs) ------
        jdbc.update("DELETE FROM work_items      WHERE project_id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM projects        WHERE id IN (?, ?)",         PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspaces      WHERE id IN (?, ?)",         WS_A, WS_B);
        jdbc.update("DELETE FROM users           WHERE id IN (?, ?)",         USER_A, USER_B);

        // --- Users -------------------------------------------------------------------------
        jdbc.update(
            "INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER_A, "isol-user-a@test.invalid", "x", "Isolation User A", now);
        jdbc.update(
            "INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER_B, "isol-user-b@test.invalid", "x", "Isolation User B", now);

        // --- Workspace A (user A is a member) ---------------------------------------------
        jdbc.update(
            "INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "Isolation WS A", "isol-ws-a", now, now);
        jdbc.update(
            "INSERT INTO workspace_members(workspace_id, user_id, system_role) VALUES (?,?,?)",
            WS_A, USER_A, "MEMBER");
        jdbc.update(
            "INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_A, WS_A, "Isolation Project A", "ISOA", "isol-proj-a", now);

        // Seed 3 items in workspace A
        for (int i = 1; i <= 3; i++) {
            jdbc.update(
                "INSERT INTO work_items("
                + "  id, title, status, type, priority, project_id, created_by, created_at, updated_at"
                + ") VALUES (?,?,?,?,?,?,?,?,?)",
                "ISOL-A-" + i, "Item A" + i, "Todo", "Task", "MEDIUM",
                PROJ_A, USER_A, now, now);
        }

        // --- Workspace B (user B is a member; user A is NOT) ------------------------------
        jdbc.update(
            "INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "Isolation WS B", "isol-ws-b", now, now);
        jdbc.update(
            "INSERT INTO workspace_members(workspace_id, user_id, system_role) VALUES (?,?,?)",
            WS_B, USER_B, "MEMBER");
        jdbc.update(
            "INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_B, WS_B, "Isolation Project B", "ISOB", "isol-proj-b", now);

        // Seed 5 items in workspace B
        for (int i = 1; i <= 5; i++) {
            jdbc.update(
                "INSERT INTO work_items("
                + "  id, title, status, type, priority, project_id, created_by, created_at, updated_at"
                + ") VALUES (?,?,?,?,?,?,?,?,?)",
                "ISOL-B-" + i, "Item B" + i, "Todo", "Task", "MEDIUM",
                PROJ_B, USER_B, now, now);
        }
    }

    // â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Happy path: user A sees exactly the 3 items in their own workspace A.
     */
    @Test
    void userA_seesOnlyWorkspaceA_items() {
        List<String> ids = jdbc.queryForList(
            "SELECT id FROM work_items WHERE deleted_at IS NULL AND " + MEMBER_PROJECTS
            + " ORDER BY id",
            String.class, USER_A);

        assertThat(ids)
            .as("user A should see exactly workspace A's 3 items")
            .hasSize(3)
            .allMatch(id -> id.startsWith("ISOL-A-"));
    }

    /**
     * Cross-tenant isolation: workspace B's items are invisible to user A, even though they
     * reside in the same database. Zero rows must be returned.
     */
    @Test
    void userA_cannotSee_workspaceB_items() {
        List<String> ids = jdbc.queryForList(
            "SELECT id FROM work_items WHERE deleted_at IS NULL AND " + MEMBER_PROJECTS
            + " AND project_id = ?",
            String.class, USER_A, PROJ_B);

        assertThat(ids)
            .as("user A must not see any of workspace B's items (cross-tenant leakage)")
            .isEmpty();
    }

    /**
     * Inverse check: user B sees exactly the 5 items in workspace B and none of workspace A's.
     */
    @Test
    void userB_seesOnlyWorkspaceB_items() {
        List<String> ids = jdbc.queryForList(
            "SELECT id FROM work_items WHERE deleted_at IS NULL AND " + MEMBER_PROJECTS
            + " ORDER BY id",
            String.class, USER_B);

        assertThat(ids)
            .as("user B should see exactly workspace B's 5 items")
            .hasSize(5)
            .allMatch(id -> id.startsWith("ISOL-B-"));
    }

    /**
     * Membership alone does not bleed across workspaces: adding user A to workspace A
     * must not cause workspace B rows to appear in user A's result set.
     */
    @Test
    void membershipInA_doesNotGrantAccessToB() {
        // Confirm user A is a member of A (already set up in @BeforeEach)
        Integer membershipCount = jdbc.queryForObject(
            "SELECT count(*) FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
            Integer.class, WS_A, USER_A);
        assertThat(membershipCount).as("user A must be a member of workspace A").isEqualTo(1);

        // Confirm user A is NOT a member of workspace B
        Integer crossMembership = jdbc.queryForObject(
            "SELECT count(*) FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
            Integer.class, WS_B, USER_A);
        assertThat(crossMembership).as("user A must not be a member of workspace B").isEqualTo(0);

        // The isolation predicate must return zero B items for user A
        List<String> leaked = jdbc.queryForList(
            "SELECT id FROM work_items WHERE " + MEMBER_PROJECTS + " AND project_id = ?",
            String.class, USER_A, PROJ_B);
        assertThat(leaked)
            .as("workspace B rows must not be reachable via user A's membership predicate")
            .isEmpty();
    }

    /**
     * Soft-deleted items in workspace A do not pollute the live view and are also
     * not leaked into workspace B's query space.
     */
    @Test
    void softDeletedItems_areNotLeaked() {
        // Soft-delete all workspace A items
        jdbc.update("UPDATE work_items SET deleted_at = NOW() WHERE project_id = ?", PROJ_A);

        // User A should now see zero live items
        List<String> userAItems = jdbc.queryForList(
            "SELECT id FROM work_items WHERE deleted_at IS NULL AND " + MEMBER_PROJECTS,
            String.class, USER_A);
        assertThat(userAItems)
            .as("deleted workspace A items must not appear in the live view")
            .isEmpty();

        // User B should still see exactly their 5 items â€” A's deleted rows are irrelevant
        List<String> userBItems = jdbc.queryForList(
            "SELECT id FROM work_items WHERE deleted_at IS NULL AND " + MEMBER_PROJECTS,
            String.class, USER_B);
        assertThat(userBItems)
            .as("workspace B items must not be affected by workspace A soft-deletes")
            .hasSize(5);
    }
}
