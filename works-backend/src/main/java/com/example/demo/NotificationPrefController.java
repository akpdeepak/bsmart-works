package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notification-preferences")
public class NotificationPrefController {

    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;

    public NotificationPrefController(JdbcTemplate jdbc, AuthenticatedUser authenticatedUser) {
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public Map<String, Object> getPrefs() {
        String userId = authenticatedUser.id();
        final String uid = userId;
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT * FROM notification_preferences WHERE user_id = ?", uid);
        if (rows.isEmpty()) {
            jdbc.update("INSERT INTO notification_preferences (user_id) VALUES (?) ON CONFLICT DO NOTHING", uid);
            return Map.of("notifyAssign", true, "notifyComment", true, "notifyMention", true, "emailDigest", false);
        }
        return rows.get(0);
    }

    @PutMapping
    public Map<String, String> updatePrefs(
            @RequestBody Map<String, Boolean> payload) {
        String userId = authenticatedUser.id();
        jdbc.update(
            "INSERT INTO notification_preferences (user_id, notify_assign, notify_comment, notify_mention, email_digest) " +
            "VALUES (?,?,?,?,?) ON CONFLICT (user_id) DO UPDATE SET " +
            "notify_assign=EXCLUDED.notify_assign, notify_comment=EXCLUDED.notify_comment, " +
            "notify_mention=EXCLUDED.notify_mention, email_digest=EXCLUDED.email_digest",
            userId,
            payload.getOrDefault("notifyAssign", true),
            payload.getOrDefault("notifyComment", true),
            payload.getOrDefault("notifyMention", true),
            payload.getOrDefault("emailDigest", false));
        return Map.of("message", "Preferences saved");
    }
}
