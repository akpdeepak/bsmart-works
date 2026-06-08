package com.bcits.works;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Backs the command palette's "search across items and people" (iteration 18, Cap S — "Cmd-K fuzzy
 * search across all actions, items, people"). Actions are a static client-side list; this service
 * supplies the dynamic half: matching work items and workspace members.
 *
 * <p><b>Tenant isolation (RB-40 §1):</b> every query is filtered by {@code workspaceId} — items via
 * their project's workspace, people via workspace membership — so the palette can never surface
 * another tenant's data regardless of the query text. Inputs are always bound, never concatenated
 * (RB-10 §6). The controller authorises {@code view_items} before calling.
 */
@Service
public class CommandSearchService {

    private static final int LIMIT = 8;

    private final JdbcTemplate jdbc;

    public CommandSearchService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Map<String, Object> search(String workspaceId, String query) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("items", searchItems(workspaceId, query));
        out.put("people", searchPeople(workspaceId, query));
        return out;
    }

    private List<Map<String, Object>> searchItems(String workspaceId, String query) {
        String like = "%" + safeLike(query) + "%";
        return jdbc.queryForList(
                "SELECT wi.id, wi.title, wi.type, wi.status FROM work_items wi "
                        + "JOIN projects p ON p.id = wi.project_id "
                        + "WHERE p.workspace_id = ? AND wi.deleted_at IS NULL "
                        + "AND (LOWER(wi.title) LIKE LOWER(?) OR LOWER(wi.id) LIKE LOWER(?)) "
                        + "ORDER BY wi.updated_at DESC LIMIT " + LIMIT,
                workspaceId, like, like);
    }

    private List<Map<String, Object>> searchPeople(String workspaceId, String query) {
        String like = "%" + safeLike(query) + "%";
        return jdbc.queryForList(
                "SELECT u.id, u.full_name, u.email FROM workspace_members wm "
                        + "JOIN users u ON u.id = wm.user_id "
                        + "WHERE wm.workspace_id = ? "
                        + "AND (LOWER(u.full_name) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?)) "
                        + "ORDER BY u.full_name LIMIT " + LIMIT,
                workspaceId, like, like);
    }

    /** Escape LIKE wildcards in user input so a literal % or _ doesn't widen the match. */
    static String safeLike(String q) {
        if (q == null) {
            return "";
        }
        return q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_").trim();
    }
}
