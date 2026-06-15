package com.bcits.works;

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
 * Widget data executor against real Postgres. Covers metric scalar/series, BQL count/group/list,
 * guided resolution, the batch path, and the mandatory governance scenarios: the workspace scope
 * keeps another tenant's rows out of every source kind (RB-40 Â§1, cross-tenant), and a bad source
 * in a batch degrades to an error entry without aborting its neighbours (error scenario).
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class WidgetDataIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired WidgetDataService service;

    private static final String WS_A = "WD-WS-A";
    private static final String WS_B = "WD-WS-B";
    private static final String PROJ_A = "WD-PROJ-A";
    private static final String PROJ_B = "WD-PROJ-B";
    private static final String USER_A = "WD-USR-A";
    private static final String USER_B = "WD-USR-B";

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("DELETE FROM work_items WHERE project_id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM projects WHERE id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspaces WHERE id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM users WHERE id IN (?, ?)", USER_A, USER_B);

        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER_A, "wd-a@test.invalid", "x", "WD User A", now);
        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER_B, "wd-b@test.invalid", "x", "WD User B", now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "WD WS A", "wd-ws-a", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "WD WS B", "wd-ws-b", now, now);
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) "
            + "VALUES (?,?,?,?)", WS_A, USER_A, "MEMBER", "MEMBER");
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) "
            + "VALUES (?,?,?,?)", WS_B, USER_B, "MEMBER", "MEMBER");
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) "
            + "VALUES (?,?,?,?,?,?)", PROJ_A, WS_A, "WD Project A", "WDA", "wda", now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) "
            + "VALUES (?,?,?,?,?,?)", PROJ_B, WS_B, "WD Project B", "WDB", "wdb", now);

        // WS A: 3 open (2 BUG assigned to A, 1 STORY unassigned), 1 done.
        insert("WDA-1", "Bug one", "Todo", "BUG", "HIGH", PROJ_A, USER_A);
        insert("WDA-2", "Bug two", "In Progress", "BUG", "CRITICAL", PROJ_A, USER_A);
        insert("WDA-3", "Story one", "Todo", "STORY", "MEDIUM", PROJ_A, null);
        insert("WDA-4", "Done one", "Done", "TASK", "LOW", PROJ_A, USER_A);
        // WS B: 5 items user A must never see through any source.
        for (int i = 1; i <= 5; i++) {
            insert("WDB-" + i, "B item " + i, "Todo", "BUG", "HIGH", PROJ_B, null);
        }
    }

    private void insert(String id, String title, String status, String type, String priority,
                        String projectId, String assignee) {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("INSERT INTO work_items(id, title, status, type, priority, project_id, "
            + "assignee_id, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            id, title, status, type, priority, projectId, assignee, USER_A, now, now);
    }

    // â”€â”€ Metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void metric_scalar_isWorkspaceScoped() {
        WidgetDataService.WidgetData open = service.resolve(WS_A, USER_A, metric("open_items"));
        assertThat(open.shape()).isEqualTo("scalar");
        assertThat(open.value()).isEqualTo(3); // WS B's 5 excluded

        WidgetDataService.WidgetData mine = service.resolve(WS_A, USER_A, metric("my_open_items"));
        assertThat(mine.value()).isEqualTo(2); // the two BUGs assigned to A
    }

    @Test
    void metric_series_groupsByType_withinWorkspace() {
        WidgetDataService.WidgetData byType = service.resolve(WS_A, USER_A, metric("by_type"));
        assertThat(byType.shape()).isEqualTo("series");
        Map<Object, Object> counts = new java.util.HashMap<>();
        byType.series().forEach(r -> counts.put(r.get("label"), r.get("value")));
        assertThat(counts).containsEntry("BUG", 2L).containsEntry("STORY", 1L).containsEntry("TASK", 1L);
    }

    // â”€â”€ BQL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void bql_count_group_and_list_areScoped() {
        WidgetDataService.WidgetData count = service.resolve(WS_A, USER_A,
            bql("status != \"Done\" AND type = \"BUG\"", "count", null, null));
        assertThat(count.value()).isEqualTo(2);

        WidgetDataService.WidgetData group = service.resolve(WS_A, USER_A,
            bql("", "group", "priority", null));
        assertThat(group.shape()).isEqualTo("series");
        assertThat(group.series()).isNotEmpty();

        WidgetDataService.WidgetData list = service.resolve(WS_A, USER_A,
            bql("assignee = currentUser()", "list", null, 5));
        assertThat(list.shape()).isEqualTo("list");
        assertThat(list.rows()).hasSize(3); // A's three assigned items, none from WS B
        assertThat(list.rows()).allSatisfy(r ->
            assertThat(((String) r.get("id"))).startsWith("WDA-"));
    }

    @Test
    void guided_resolvesThroughTheSameScopedPath() {
        WidgetSource guided = new WidgetSource("guided", null, null,
            new WidgetSource.GuidedSpec(true, true, null, List.of("BUG"), null), "count", null, null);
        WidgetDataService.WidgetData data = service.resolve(WS_A, USER_A, guided);
        assertThat(data.value()).isEqualTo(2);
    }

    // â”€â”€ Cross-tenant (RB-40 Â§1 mandatory scenario) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void nonMember_cannotResolveAgainstAnotherWorkspace() {
        // The membership gate IS the tenant boundary: user A is not a member of WS B, so every
        // source kind is refused before any row is read â€” not silently returned empty.
        assertThatThrownBy(() -> service.resolve(WS_B, USER_A, metric("open_items")))
            .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.resolve(WS_B, USER_A, bql("", "list", null, 50)))
            .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.batch(WS_B, USER_A, Map.of("w", metric("open_items"))))
            .isInstanceOf(ApiException.class);

        // And WS B's own member sees exactly WS B's 5 rows â€” never WS A's.
        WidgetDataService.WidgetData bOpen = service.resolve(WS_B, USER_B, metric("open_items"));
        assertThat(bOpen.value()).isEqualTo(5);
        WidgetDataService.WidgetData bList = service.resolve(WS_B, USER_B, bql("", "list", null, 50));
        assertThat(bList.rows()).allSatisfy(r ->
            assertThat(((String) r.get("id"))).startsWith("WDB-"));
    }

    // â”€â”€ Batch + error degradation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @Test
    void batch_resolvesAll_andIsolatesAnInvalidSource() {
        Map<String, WidgetSource> sources = new java.util.LinkedHashMap<>();
        sources.put("w1", metric("open_items"));
        sources.put("w2", bql("status != \"Done\"", "group", "status", null));
        sources.put("w3", metric("does_not_exist"));   // bad â†’ error entry, must not abort the batch
        sources.put("w4", bql("", "group", "nonsense_dim", null)); // bad group dim â†’ error entry

        List<WidgetDataService.BatchResult> results = service.batch(WS_A, USER_A, sources);
        assertThat(results).hasSize(4);
        Map<String, WidgetDataService.BatchResult> byId = new java.util.HashMap<>();
        results.forEach(r -> byId.put(r.id(), r));

        assertThat(byId.get("w1").data().value()).isEqualTo(3);
        assertThat(byId.get("w2").data().shape()).isEqualTo("series");
        assertThat(byId.get("w3").data()).isNull();
        assertThat(byId.get("w3").error()).isNotBlank();
        assertThat(byId.get("w4").error()).contains("Group dimension");
    }

    private static WidgetSource metric(String key) {
        return new WidgetSource("metric", key, null, null, null, null, null);
    }

    private static WidgetSource bql(String query, String mode, String groupBy, Integer limit) {
        return new WidgetSource("bql", null, query, null, mode, groupBy, limit);
    }
}
