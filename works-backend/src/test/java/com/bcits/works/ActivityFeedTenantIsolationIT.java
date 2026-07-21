package com.bcits.works;

import com.bcits.works.auth.UserPiiService;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Real-Postgres proof that the work-item activity feed cannot be used to read another tenant's
 * event stream (RB-40 §1).
 *
 * <p>The feed's only authorization gate is {@code rbac.workspaceForWorkItem(id)}, which resolves
 * the owning workspace <em>via work_items</em>. Any {@code aggregate_id} that is not a work item —
 * a project, sprint, SLA policy, compliance rule — resolves to {@code null}, and the gate is
 * skipped rather than denied. The read itself (`FROM events WHERE aggregate_id = ?`) carries no
 * workspace predicate, so the caller receives that aggregate's full history regardless of tenant.
 *
 * <p>Note this needs no membership in the victim workspace at all, unlike the
 * {@code DeveloperWorkspaceDao} actor-stream leak which required dual membership.
 *
 * <p>{@code events} is append-only (V40 trigger), so seeded events are never deleted between
 * runs — assertions are therefore written to tolerate accumulation.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class ActivityFeedTenantIsolationIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    private static final String OUTSIDER = "ACTFEED-USR";
    private static final String WS_A = "ACTFEED-WS-A";
    private static final String WS_B = "ACTFEED-WS-B";
    private static final String PROJ_A = "ACTFEED-PROJ-A";
    private static final String PROJ_B = "ACTFEED-PROJ-B";
    private static final String ITEM_A = "ACTFEED-WI-A";

    @Autowired JdbcTemplate jdbc;
    @Autowired RbacGate rbac;
    @Autowired UserPiiService userPii;

    private ActivityController controller;

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("DELETE FROM work_items WHERE project_id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM projects WHERE id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspaces WHERE id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM users WHERE id = ?", OUTSIDER);

        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            OUTSIDER, "actfeed@test.invalid", "x", "Activity Outsider", now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "Activity A", "actfeed-a", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "Activity B", "actfeed-b", now, now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_A, WS_A, "Activity Project A", "AFA", "actfeed-proj-a", now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_B, WS_B, "Activity Project B", "AFB", "actfeed-proj-b", now);

        // The caller belongs to workspace A ONLY — they have no standing whatsoever in B.
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) VALUES (?,?,?,?)",
            WS_A, OUTSIDER, "MEMBER", "MEMBER");

        jdbc.update("INSERT INTO work_items(id, title, status, type, priority, project_id, created_by, "
            + "created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            ITEM_A, "A's own item", "Open", "Task", "LOW", PROJ_A, OUTSIDER, now, now);

        // Workspace B's private project history. aggregate_id is a PROJECT id, so it can never be
        // resolved by workspaceForWorkItem — this is the shape written by
        // WorkspaceService.recordInWorkspace(ws, projectId, "PROJECT_MEMBER_ADDED", ...).
        jdbc.update("INSERT INTO events(aggregate_id, event_type, actor_id, payload, occurred_at, workspace_id) "
            + "VALUES (?,?,?,?,?,?)",
            PROJ_B, "PROJECT_MEMBER_ADDED", OUTSIDER, "{\"secret\":\"B private membership change\"}", now, WS_B);

        // The caller's OWN legitimate work-item history, written the way recordDiff() writes it:
        // workspace_id is left NULL. This is the post-V40 reality for every work-item edit.
        jdbc.update("INSERT INTO events(aggregate_id, event_type, actor_id, payload, occurred_at, "
            + "field_name, old_value, new_value) VALUES (?,?,?,?,?,?,?,?)",
            ITEM_A, "STATUS_CHANGED", OUTSIDER, "{\"field\":\"status\"}", now, "status", "Open", "Done");

        controller = new ActivityController(jdbc, new AuthenticatedUser() {
            @Override public String id() { return OUTSIDER; }
        }, rbac, userPii);
    }

    /**
     * RED: a non-work-item aggregate id skips the gate entirely, handing the caller workspace B's
     * project history. The feed must refuse rather than fall open.
     */
    @Test
    void nonWorkItemAggregateIdMustNotBypassTheWorkspaceGate() {
        assertThatThrownBy(() -> controller.getActivity(PROJ_B, null))
            .isInstanceOf(ApiException.class);
    }

    /**
     * The fix must close the bypass without emptying the real feed: work-item events carry a NULL
     * workspace_id (recordDiff never sets it), so any equality predicate on that column would
     * silently blank this surface.
     */
    @Test
    void ownWorkItemFeedStillReturnsEventsThatCarryNoWorkspaceId() {
        List<Map<String, Object>> rows = controller.getActivity(ITEM_A, null);

        assertThat(rows).extracting(r -> r.get("event_type")).contains("STATUS_CHANGED");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM events WHERE aggregate_id = ? AND workspace_id IS NULL",
            Long.class, ITEM_A)).isPositive();
    }
}
