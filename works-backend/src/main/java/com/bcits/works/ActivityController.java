package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/work-items/{workItemId}/activity")
public class ActivityController {

    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final UserPiiService userPii;

    public ActivityController(JdbcTemplate jdbc, AuthenticatedUser authenticatedUser, RbacService rbac,
                              UserPiiService userPii) {
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.userPii = userPii;
    }

    // Read the actor_id (a surrogate) — NOT a raw users.full_name join (RB-40 §3): identity PII is
    // resolved at render through the PII vault, so the feed follows the vault when reads switch and
    // shows "[erased]" after a crypto-shred, and the immutable events log carries only ids.
    private static final String BASE_SQL =
        "SELECT e.id, e.event_type, e.payload, e.occurred_at,"
        + " e.field_name, e.old_value, e.new_value, e.actor_id "
        + "FROM events e WHERE e.aggregate_id = ?";

    @GetMapping
    public List<Map<String, Object>> getActivity(@PathVariable String workItemId,
                                                  @RequestParam(required = false) String eventType) {
        // Workspace-scoped (RB-40 §1): the caller must be able to view the item's workspace — same
        // gate as StatusDurationController, so a user cannot read another tenant's activity feed.
        String workspaceId = rbac.workspaceForWorkItem(workItemId);
        if (workspaceId != null) {
            rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        }
        List<Map<String, Object>> rows = (eventType != null && !eventType.isBlank())
            ? jdbc.queryForList(BASE_SQL + " AND e.event_type = ? ORDER BY e.occurred_at DESC LIMIT 50", workItemId, eventType)
            : jdbc.queryForList(BASE_SQL + " ORDER BY e.occurred_at DESC LIMIT 50", workItemId);

        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            Map<String, Object> m = new LinkedHashMap<>(row);
            // Resolve the actor's display name at render via the vault; never expose the raw actor id.
            Object actorId = m.remove("actor_id");
            String actorName = actorId != null ? userPii.displayNameById(actorId.toString()) : null;
            m.put("actor_name", actorName != null ? actorName : "System");
            // Assignee-change events store user ids in old/new value — resolve to display names for
            // rendering (unassigned -> null). Other field diffs are already non-PII literals.
            if ("assignee".equals(m.get("field_name"))) {
                m.put("old_value", resolveAssignee(m.get("old_value")));
                m.put("new_value", resolveAssignee(m.get("new_value")));
            }
            out.add(m);
        }
        return out;
    }

    /** Resolve an assignee user id to a display name via the vault; null for unassigned; the raw id
     *  if the user is unknown (e.g. deleted). */
    private String resolveAssignee(Object idValue) {
        if (idValue == null || idValue.toString().isBlank()) {
            return null;
        }
        String name = userPii.displayNameById(idValue.toString());
        return name != null ? name : idValue.toString();
    }
}
