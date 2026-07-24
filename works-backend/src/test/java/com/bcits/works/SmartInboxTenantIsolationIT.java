package com.bcits.works;

import com.bcits.works.messaging.NotificationActivityService;
import com.bcits.works.messaging.SmartInboxService;

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

import java.time.Duration;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** Real-Postgres proof that Inbox projection and caller state stay inside the active workspace. */
@Tag("integration")
@Testcontainers
@SpringBootTest
class SmartInboxTenantIsolationIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    private static final String USER = "INBOX-USR";
    private static final String WS_A = "INBOX-WS-A";
    private static final String WS_B = "INBOX-WS-B";

    @Autowired JdbcTemplate jdbc;
    @Autowired SmartInboxService inbox;
    @Autowired NotificationActivityService activity;

    private long notificationA;
    private long notificationB;

    @BeforeEach
    void seed() {
        jdbc.update("DELETE FROM inbox_item_states WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM notifications WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM workspaces WHERE id IN (?, ?)", WS_A, WS_B);
        jdbc.update("DELETE FROM users WHERE id = ?", USER);

        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update("INSERT INTO users(id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)",
            USER, "inbox@test.invalid", "x", "Inbox User", now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_A, "Inbox A", "inbox-a", now, now);
        jdbc.update("INSERT INTO workspaces(id, name, slug, created_at, updated_at) VALUES (?,?,?,?,?)",
            WS_B, "Inbox B", "inbox-b", now, now);
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) VALUES (?,?,?,?)",
            WS_A, USER, "MEMBER", "MEMBER");
        jdbc.update("INSERT INTO workspace_members(workspace_id, user_id, system_role, role_id) VALUES (?,?,?,?)",
            WS_B, USER, "MEMBER", "MEMBER");

        notificationA = insertNotification(WS_A, "A only");
        notificationB = insertNotification(WS_B, "B only");
    }

    @Test
    void sameUserSeesOnlyTheActiveWorkspaceAndMeetsTheReadBudget() {
        long started = System.nanoTime();
        var a = inbox.list(WS_A, USER);
        Duration elapsed = Duration.ofNanos(System.nanoTime() - started);

        assertThat(a).extracting(SmartInboxService.InboxItem::message).containsExactly("A only");
        assertThat(a).extracting(SmartInboxService.InboxItem::message).doesNotContain("B only");
        assertThat(elapsed).isLessThan(Duration.ofSeconds(2));
    }

    @Test
    void activityHistoryIsAlsoScopedToTheActiveWorkspace() {
        assertThat(activity.list(WS_A, USER, 0, 50))
            .extracting(notification -> notification.getMessage())
            .containsExactly("A only");
        assertThat(activity.list(WS_B, USER, 0, 50))
            .extracting(notification -> notification.getMessage())
            .containsExactly("B only");
    }

    @Test
    void doneAndSnoozeStateAreScopedToWorkspaceAndCaller() {
        inbox.markDone(WS_A, USER, "notification:" + notificationA);
        assertThat(inbox.list(WS_A, USER)).isEmpty();
        assertThat(inbox.list(WS_B, USER)).hasSize(1);

        inbox.snooze(WS_A, USER, "notification:" + notificationB, OffsetDateTime.now().plusHours(2));
        assertThat(inbox.list(WS_B, USER)).hasSize(1);
    }

    private long insertNotification(String workspaceId, String message) {
        return jdbc.queryForObject("""
            INSERT INTO notifications(workspace_id, user_id, type, message, is_read, created_at)
            VALUES (?, ?, 'MENTION', ?, false, NOW()) RETURNING id
            """, Long.class, workspaceId, USER, message);
    }
}
