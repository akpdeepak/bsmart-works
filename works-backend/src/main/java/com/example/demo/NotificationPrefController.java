package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notification-preferences")
@CrossOrigin(origins = "http://localhost:5173")
public class NotificationPrefController {

    private final JdbcTemplate jdbc;

    public NotificationPrefController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public Map<String, Object> getPrefs(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId == null) userId = "USR-001";
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
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody Map<String, Boolean> payload) {
        if (userId == null) userId = "USR-001";
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
