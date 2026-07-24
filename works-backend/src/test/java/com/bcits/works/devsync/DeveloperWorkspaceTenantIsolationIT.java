package com.bcits.works.devsync;
import com.bcits.works.auth.api.User;
import com.bcits.works.projects.api.Project;
import com.bcits.works.shared.EventService;
import com.bcits.works.workspaces.api.Workspace;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
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

/**
 * Cross-tenant isolation IT for the Developer Workspace read path (RB-40 §1). Regression guard for
 * the leak in {@link DeveloperWorkspaceDao}, whose {@code recentActivity} query selected from
 * {@code events} on {@code actor_id} alone and whose {@code workItemPriority} query selected from
 * {@code work_items} by primary key alone — neither carried a {@code workspace_id} predicate, so a
 * user who belongs to two workspaces saw both tenants' rows merged into whichever Developer
 * Workspace surface they were viewing.
 *
 * <p>One user, member of both workspaces, is the whole point: RBAC passes in <b>both</b> tenants,
 * so only a workspace predicate in the SQL can keep the rows apart.
 *
 * <p>{@code events} is append-only (V40 trigger) — seeded rows cannot be deleted between tests, so
 * the class seeds once ({@link TestInstance.Lifecycle#PER_CLASS}) and asserts on membership rather
 * than exact row counts.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class DeveloperWorkspaceTenantIsolationIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    private static final String USER   = "DEVWS-USR";
    private static final String WS_A   = "DEVWS-WS-A";
    private static final String WS_B   = "DEVWS-WS-B";
    private static final String PROJ_A = "DEVWS-PROJ-A";
    private static final String PROJ_B = "DEVWS-PROJ-B";
    private static final String ITEM_A = "DEVWS-ITEM-A";
    private static final String ITEM_B = "DEVWS-ITEM-B";
    private static final String BLOCKER_A = "DEVWS-BLOCKER-A";
    private static final String BLOCKER_B = "DEVWS-BLOCKER-B";
    private static final String PR_A   = "DEVWS-PR-A";

    private static final String AGG_A1 = "DEVWS-AGG-A1";
    private static final String AGG_A2 = "DEVWS-AGG-A2";
    private static final String AGG_B1 = "DEVWS-AGG-B1";
    private static final String AGG_B2 = "DEVWS-AGG-B2";
    private static final String AGG_LEGACY = "DEVWS-AGG-LEGACY";

    @Autowired JdbcTemplate jdbc;
    @Autowired DeveloperWorkspaceService service;
    @Autowired DeveloperWorkspaceDao dao;

    @BeforeAll
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();

        jdbc.update("DELETE FROM pull_request_reviewers WHERE reviewer_id = ?", USER);
        jdbc.update("DELETE FROM pull_requests WHERE id = ?", PR_A);
        jdbc.update("DELETE FROM work_items WHERE project_id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM projects WHERE id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspaces WHERE id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM users WHERE id = ?", USER);

        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER, "devws@test.invalid", "x", "Dev WS User", now);

        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "Dev WS A", "devws-ws-a", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "Dev WS B", "devws-ws-b", now, now);

        // The same engineer works in BOTH tenants — RBAC passes in both, so only SQL scope isolates.
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) VALUES (?,?,?,?)",
            WS_A, USER, "MEMBER", "MEMBER");
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) VALUES (?,?,?,?)",
            WS_B, USER, "MEMBER", "MEMBER");

        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_A, WS_A, "Dev Project A", "DVA", "devws-proj-a", now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_B, WS_B, "Dev Project B", "DVB", "devws-proj-b", now);

        seedItem(ITEM_A, "A item", "LOW", PROJ_A, now);
        seedItem(ITEM_B, "B item", "P0", PROJ_B, now);
        seedItem(BLOCKER_A, "A blocker", "LOW", PROJ_A, now);
        seedItem(BLOCKER_B, "B blocker", "LOW", PROJ_B, now);

        // work_item_links carries no workspace column and nothing stops target_id naming another
        // tenant's row, so each item is blocked by one same-tenant and one cross-tenant item.
        seedLink(ITEM_A, BLOCKER_A);
        seedLink(ITEM_A, BLOCKER_B);
        seedLink(ITEM_B, BLOCKER_A);

        // The same actor's event stream, split across the two tenants.
        seedEvent(AGG_A1, WS_A, "WORK_ITEM_CREATED", now.minusMinutes(4));
        seedEvent(AGG_A2, WS_A, "WORK_ITEM_UPDATED", now.minusMinutes(3));
        seedEvent(AGG_B1, WS_B, "WORK_ITEM_CREATED", now.minusMinutes(2));
        seedEvent(AGG_B2, WS_B, "WORK_ITEM_UPDATED", now.minusMinutes(1));
        // No workspace dimension and an aggregate that names no work item: belongs to no tenant.
        seedEvent(AGG_LEGACY, null, "LEGACY_EVENT", now.minusMinutes(5));
        // No workspace dimension either — but this is what EventService.record/recordDiff write on
        // every call today, and the aggregate is a workspace-A work item, so it belongs to A.
        seedEvent(ITEM_A, null, "WORK_ITEM_UPDATED", now.minusMinutes(6));

        // A PR that lives in workspace A but references workspace B's work item. This is the exact
        // shape the unscoped priority lookup leaked: the tenant guard on the PR passes, then the
        // by-PK work-item read walks straight out of the tenant.
        jdbc.update("INSERT INTO pull_requests(id, workspace_id, repo, number, title, author_id, status, "
            + "work_item_id, additions, deletions, files_changed, created_at, updated_at) "
            + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            PR_A, WS_A, "acme/api", 1, "A pull request", USER, "OPEN", ITEM_B, 10, 2, 3, now, now);
        jdbc.update("INSERT INTO pull_request_reviewers(pull_request_id, reviewer_id, state, requested_at) "
            + "VALUES (?,?,?,?)", PR_A, USER, "REQUESTED", now);
    }

    private void seedItem(String id, String title, String priority, String projectId, OffsetDateTime now) {
        jdbc.update("INSERT INTO work_items("
            + " id, title, status, type, priority, project_id, assignee_id, created_by, created_at, updated_at"
            + ") VALUES (?,?,?,?,?,?,?,?,?,?)",
            id, title, "Open", "Task", priority, projectId, USER, USER, now, now);
    }

    private void seedLink(String sourceId, String targetId) {
        jdbc.update("INSERT INTO work_item_links(source_id, target_id, link_type) VALUES (?,?,'BLOCKED_BY')",
            sourceId, targetId);
    }

    private void seedEvent(String aggregateId, String workspaceId, String eventType, OffsetDateTime at) {
        jdbc.update("INSERT INTO events(aggregate_id, workspace_id, event_type, actor_id, payload, occurred_at) "
            + "VALUES (?,?,?,?,?,?)", aggregateId, workspaceId, eventType, USER, "{}", at);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> rows(Map<String, Object> home, String key) {
        return (List<Map<String, Object>>) home.get(key);
    }

    @Test
    void recentActivityInWorkspaceA_neverIncludesWorkspaceBevents() {
        List<Map<String, Object>> activity = rows(service.home(WS_A, USER), "recentActivity");

        assertThat(activity).extracting(e -> e.get("aggregateId"))
            .as("the active workspace's own events are still returned")
            .contains(AGG_A1, AGG_A2);
        assertThat(activity).extracting(e -> e.get("aggregateId"))
            .as("workspace B's events must never appear on workspace A's surface (RB-40 §1)")
            .doesNotContain(AGG_B1, AGG_B2);
    }

    @Test
    void recentActivityInWorkspaceB_neverIncludesWorkspaceAevents() {
        List<Map<String, Object>> activity = rows(service.home(WS_B, USER), "recentActivity");

        assertThat(activity).extracting(e -> e.get("aggregateId")).contains(AGG_B1, AGG_B2);
        assertThat(activity).extracting(e -> e.get("aggregateId")).doesNotContain(AGG_A1, AGG_A2);
    }

    /**
     * An event with no {@code workspace_id} whose aggregate cannot be placed belongs to no tenant.
     * This is the only genuinely fail-closed case.
     */
    @Test
    void recentActivity_failsClosedOnEventsWithNoWorkspaceAndNoPlaceableAggregate() {
        assertThat(rows(service.home(WS_A, USER), "recentActivity"))
            .extracting(e -> e.get("aggregateId"))
            .as("no workspace id and an aggregate that matches no work item — belongs to nobody")
            .doesNotContain(AGG_LEGACY);
        assertThat(rows(service.home(WS_B, USER), "recentActivity"))
            .extracting(e -> e.get("aggregateId"))
            .doesNotContain(AGG_LEGACY);
    }

    /**
     * The regression a bare {@code workspace_id = ?} predicate would cause. NULL is not a historical
     * artefact: {@code EventService.record} and {@code recordDiff} write it on every call today
     * (only {@code recordInWorkspace} sets the column, and about half the producers use it), so
     * matching on the column alone silently empties most of the feed. An event that names no
     * workspace but whose aggregate is a work item in this workspace still belongs here — and, just
     * as importantly, still must not appear in the other tenant.
     */
    @Test
    void recentActivity_keepsUnlabelledEventsWhoseAggregateThisWorkspaceOwns() {
        assertThat(rows(service.home(WS_A, USER), "recentActivity"))
            .extracting(e -> e.get("aggregateId"))
            .as("written by EventService.record today; the aggregate is a workspace-A work item")
            .contains(ITEM_A);
        assertThat(rows(service.home(WS_B, USER), "recentActivity"))
            .extracting(e -> e.get("aggregateId"))
            .as("the same unlabelled event must not leak into the other tenant (RB-40 §1)")
            .doesNotContain(ITEM_A);
    }

    @Test
    void reviewQueuePriorityLookup_doesNotLeakAnotherTenantsWorkItem() {
        List<Map<String, Object>> queue = rows(service.home(WS_A, USER), "reviewQueue");

        assertThat(queue).as("the workspace-A pull request is still queued").hasSize(1);
        assertThat(queue.get(0).get("linkedPriority"))
            .as("the linked item lives in workspace B, so its priority must not cross the boundary")
            .isNull();
    }

    @Test
    void workItemPriority_isResolvedOnlyWithinTheCallersWorkspace() {
        assertThat(dao.workItemPriority(WS_A, ITEM_A))
            .as("an item in the caller's own workspace still resolves")
            .isEqualTo("LOW");
        assertThat(dao.workItemPriority(WS_A, ITEM_B))
            .as("an item in another workspace resolves to nothing, not to its real priority")
            .isNull();
        assertThat(dao.workItemPriority(WS_B, ITEM_B)).isEqualTo("P0");
    }

    @Test
    void blockers_scopeBothSidesOfTheLink() {
        List<Map<String, Object>> blocked = dao.blockers(WS_A, USER);

        assertThat(blocked).extracting(b -> b.get("id"))
            .as("a blocker inside the same workspace is still reported")
            .containsExactly(ITEM_A);
        assertThat(blocked).extracting(b -> b.get("blockerTitle"))
            .as("work_item_links does not constrain target_id to the source's tenant, so the "
                + "blocker side needs its own workspace predicate")
            .containsExactly("A blocker");
        assertThat(dao.blockers(WS_B, USER))
            .as("the cross-workspace link must not make B's item look blocked either")
            .isEmpty();
    }
}
