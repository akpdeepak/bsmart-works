package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Per-user keyboard-shortcut overrides (iteration 18, Cap S — "Customizable per user"). The default
 * bindings live in the frontend; this stores only the rows where a user has rebound an action. A
 * shortcut belongs to a person, not a workspace, so it is keyed by user id and carries no workspace
 * scope. The binding string is validated (non-blank, bounded) before it is persisted.
 */
@Service
public class UserShortcutService {

    private final JdbcTemplate jdbc;

    public UserShortcutService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** action_id → keys for everything this user has customized. */
    public Map<String, String> getForUser(String userId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT action_id, keys FROM user_shortcuts WHERE user_id = ? ORDER BY action_id", userId);
        Map<String, String> out = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            out.put((String) row.get("action_id"), (String) row.get("keys"));
        }
        return out;
    }

    public Map<String, String> set(String userId, String actionId, String keys) {
        if (actionId == null || actionId.isBlank()) {
            throw ApiException.badRequest("INVALID_ACTION", "An action id is required.");
        }
        if (keys == null || keys.isBlank() || keys.length() > 100) {
            throw ApiException.badRequest("INVALID_SHORTCUT", "A shortcut binding (1–100 chars) is required.");
        }
        jdbc.update(
                "INSERT INTO user_shortcuts (user_id, action_id, keys, updated_at) VALUES (?,?,?,NOW()) "
                        + "ON CONFLICT (user_id, action_id) DO UPDATE SET keys = EXCLUDED.keys, updated_at = NOW()",
                userId, actionId, keys.trim());
        return getForUser(userId);
    }

    public Map<String, String> reset(String userId, String actionId) {
        if (actionId == null || actionId.isBlank()) {
            jdbc.update("DELETE FROM user_shortcuts WHERE user_id = ?", userId);
        } else {
            jdbc.update("DELETE FROM user_shortcuts WHERE user_id = ? AND action_id = ?", userId, actionId);
        }
        return getForUser(userId);
    }
}
