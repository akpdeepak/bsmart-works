package com.bcits.works;
import com.bcits.works.auth.api.User;
import com.bcits.works.projects.api.Project;

import com.bcits.works.reporting.BqlSubscription;
import com.bcits.works.reporting.BqlSubscriptionRepository;
import com.bcits.works.reporting.BqlSubscriptionService;

import com.bcits.works.shared.ApiException;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Integration tests for saved-view subscriptions against real Postgres. Covers the lifecycle plus
 * the governance scenarios (RB-05 Stage 3): a delivery counts <b>workspace-scoped</b> matches,
 * records a SUBSCRIPTION <b>audit</b> row and an in-app notification, and a subscription whose owner
 * has <b>lost workspace access</b> is deactivated rather than leaking counts (RB-40 Â§1).
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class BqlSubscriptionIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired JdbcTemplate jdbc;
    @Autowired BqlSubscriptionService service;
    @Autowired BqlSubscriptionRepository subs;

    private static final String WS_A = "SUB-WS-A";
    private static final String WS_B = "SUB-WS-B";
    private static final String PROJ_A = "SUB-PROJ-A";
    private static final String PROJ_B = "SUB-PROJ-B";
    private static final String USER_A = "SUB-USR-A";   // MEMBER in WS A
    private static final String VIEW_ID = "SUB-VIEW-1";

    @BeforeEach
    void seed() {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("DELETE FROM bql_subscriptions WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM bql_run_audits WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM notifications WHERE user_id = ?", USER_A);
        jdbc.update("DELETE FROM saved_views WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM work_items WHERE project_id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM projects WHERE id IN (?, ?)", PROJ_A, PROJ_B);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspaces WHERE id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM users WHERE id = ?", USER_A);

        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER_A, "sub-a@test.invalid", "x", "Sub User A", now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "Sub WS A", "sub-ws-a", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "Sub WS B", "sub-ws-b", now, now);
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) VALUES (?,?,?,?)",
            WS_A, USER_A, "MEMBER", "MEMBER");
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_A, WS_A, "Sub Project A", "SUA", "sub-proj-a", now);
        jdbc.update("INSERT INTO projects(id, workspace_id, name, key_prefix, slug, created_at) VALUES (?,?,?,?,?,?)",
            PROJ_B, WS_B, "Sub Project B", "SUB", "sub-proj-b", now);

        // 2 HIGH bugs in A, 3 in B â€” the count must only reflect A (the subscription's workspace).
        item("SUB-A-1", "A bug", "HIGH", PROJ_A);
        item("SUB-A-2", "A bug 2", "HIGH", PROJ_A);
        for (int i = 1; i <= 3; i++) item("SUB-B-" + i, "B bug " + i, "HIGH", PROJ_B);

        jdbc.update("INSERT INTO saved_views(id, workspace_id, name, bql_filter, column_keys, "
            + "is_shared, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            VIEW_ID, WS_A, "High bugs", "priority = HIGH AND type = Bug", "[]", true, USER_A, now, now);
    }

    private void item(String id, String title, String priority, String projectId) {
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("INSERT INTO work_items(id, title, status, type, priority, project_id, "
            + "created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            id, title, "Open", "Bug", priority, projectId, USER_A, now, now);
    }

    @Test
    void subscribe_isIdempotentPerViewAndUser() {
        service.subscribe(USER_A, WS_A, VIEW_ID, "DAILY", "BOTH");
        service.subscribe(USER_A, WS_A, VIEW_ID, "WEEKLY", "IN_APP"); // re-subscribe updates in place
        assertThat(service.list(USER_A, WS_A)).hasSize(1);
        assertThat(service.list(USER_A, WS_A).get(0).getFrequency()).isEqualTo("WEEKLY");
    }

    @Test
    void subscribe_rejectsBadFrequency() {
        assertThrows(ApiException.class, () -> service.subscribe(USER_A, WS_A, VIEW_ID, "HOURLY", "BOTH"));
    }

    @Test
    void deliver_countsOwnTenantOnly_andAuditsAndNotifies() {
        BqlSubscription sub = service.subscribe(USER_A, WS_A, VIEW_ID, "DAILY", "BOTH");
        int count = service.deliver(sub);

        // 2 HIGH bugs in A â€” never the 3 in B.
        assertThat(count).isEqualTo(2);
        Integer audited = jdbc.queryForObject(
            "SELECT result_count FROM bql_run_audits WHERE workspace_id = ? AND source = 'SUBSCRIPTION'",
            Integer.class, WS_A);
        assertThat(audited).isEqualTo(2);
        Integer notifs = jdbc.queryForObject(
            "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND type = 'BQL_SUBSCRIPTION'",
            Integer.class, USER_A);
        assertThat(notifs).isEqualTo(1);
        // last_run_at stamped so the scheduler won't immediately re-deliver.
        assertThat(subs.findById(sub.getId()).orElseThrow().getLastRunAt()).isNotNull();
    }

    @Test
    void deliver_deactivatesWhenOwnerLostAccess() {
        BqlSubscription sub = service.subscribe(USER_A, WS_A, VIEW_ID, "DAILY", "IN_APP");
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?", WS_A, USER_A);

        int count = service.deliver(sub);
        assertThat(count).isEqualTo(-1);
        assertThat(subs.findById(sub.getId()).orElseThrow().isActive()).isFalse();
    }
}
