package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Offline-draft sync with conflict detection (iteration 18, Cap S — "Read and create drafts offline;
 * sync on reconnect. Conflict resolution UI."). A client that edited a work item offline replays its
 * draft here on reconnect, carrying the {@code version} it last saw. Optimistic concurrency on the
 * existing {@code work_items.version} column decides the outcome:
 * <ul>
 *   <li><b>APPLIED</b> — the server is still at the client's base version; the draft is written and
 *       the version bumped.</li>
 *   <li><b>CONFLICT</b> — someone else changed the item meanwhile; the server returns the current
 *       server state so the frontend can render its conflict-resolution UI. Nothing is overwritten.</li>
 *   <li><b>MISSING</b> — the item no longer exists.</li>
 * </ul>
 *
 * <p>RBAC (RB-10 §2) and tenant scoping (RB-40 §1): the item's workspace is resolved from its
 * project, and the caller must be allowed to edit it (own or any) before any write. All queries are
 * bound, never concatenated.
 */
@Service
public class DraftSyncService {

    private final JdbcTemplate jdbc;
    private final RbacService rbac;
    private final EventService events;

    public DraftSyncService(JdbcTemplate jdbc, RbacService rbac, EventService events) {
        this.jdbc = jdbc;
        this.rbac = rbac;
        this.events = events;
    }

    public record Draft(String id, Integer baseVersion, String title, String description, String status) { }

    /** Reconcile a batch of drafts; one result per draft, in order. */
    public List<Map<String, Object>> syncWorkItemDrafts(String userId, List<Draft> drafts) {
        List<Map<String, Object>> results = new java.util.ArrayList<>();
        for (Draft draft : drafts) {
            results.add(syncOne(userId, draft));
        }
        return results;
    }

    private Map<String, Object> syncOne(String userId, Draft draft) {
        if (draft.id() == null || draft.id().isBlank()) {
            throw ApiException.badRequest("INVALID_DRAFT", "Each draft must carry a work item id.");
        }
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT wi.version, wi.title, wi.description, wi.status, wi.created_by, wi.assignee_id, "
                        + "p.workspace_id FROM work_items wi JOIN projects p ON p.id = wi.project_id "
                        + "WHERE wi.id = ? AND wi.deleted_at IS NULL", draft.id());
        if (rows.isEmpty()) {
            return result(draft.id(), "MISSING", null);
        }
        Map<String, Object> row = rows.get(0);
        String workspaceId = (String) row.get("workspace_id");
        if (!rbac.canEdit(userId, workspaceId, (String) row.get("created_by"), (String) row.get("assignee_id"))) {
            throw ApiException.forbidden("You do not have permission to edit this work item.");
        }

        int currentVersion = ((Number) row.get("version")).intValue();
        int baseVersion = draft.baseVersion() == null ? -1 : draft.baseVersion();
        if (!"APPLIED".equals(resolve(baseVersion, currentVersion))) {
            Map<String, Object> server = new LinkedHashMap<>();
            server.put("version", currentVersion);
            server.put("title", row.get("title"));
            server.put("description", row.get("description"));
            server.put("status", row.get("status"));
            return result(draft.id(), "CONFLICT", server);
        }

        String title = draft.title() != null ? draft.title() : (String) row.get("title");
        String description = draft.description() != null ? draft.description() : (String) row.get("description");
        String status = draft.status() != null ? draft.status() : (String) row.get("status");
        jdbc.update(
                "UPDATE work_items SET title = ?, description = ?, status = ?, version = version + 1, "
                        + "updated_at = NOW() WHERE id = ? AND version = ?",
                title, description, status, draft.id(), currentVersion);
        events.recordInWorkspace(workspaceId, draft.id(), "WORK_ITEM_DRAFT_SYNCED", userId,
                Map.of("from", "offline-draft"));

        Map<String, Object> applied = new LinkedHashMap<>();
        applied.put("version", currentVersion + 1);
        return result(draft.id(), "APPLIED", applied);
    }

    /** Pure optimistic-concurrency decision — the unit of the conflict logic. */
    static String resolve(int baseVersion, int currentVersion) {
        return baseVersion == currentVersion ? "APPLIED" : "CONFLICT";
    }

    private Map<String, Object> result(String id, String outcome, Map<String, Object> server) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("id", id);
        r.put("result", outcome);
        if (server != null) {
            r.put("server", server);
        }
        return r;
    }
}
