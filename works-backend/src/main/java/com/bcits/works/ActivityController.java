package com.bcits.works;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/work-items/{workItemId}/activity")
public class ActivityController {

    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ActivityController(JdbcTemplate jdbc, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<Map<String, Object>> getActivity(@PathVariable String workItemId,
                                                  @RequestParam(required = false) String eventType) {
        // Workspace-scoped (RB-40 §1): the caller must be able to view the item's workspace — same
        // gate as StatusDurationController, so a user cannot read another tenant's activity feed.
        String workspaceId = rbac.workspaceForWorkItem(workItemId);
        if (workspaceId != null) {
            rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        }
        String base = "SELECT e.id, e.event_type, e.payload, e.occurred_at,"
            + " e.field_name, e.old_value, e.new_value, u.full_name as actor_name " +
            "FROM events e LEFT JOIN users u ON u.id = e.actor_id WHERE e.aggregate_id = ?";
        if (eventType != null && !eventType.isBlank()) {
            return jdbc.queryForList(base + " AND e.event_type = ? ORDER BY e.occurred_at DESC LIMIT 50", workItemId, eventType);
        }
        return jdbc.queryForList(base + " ORDER BY e.occurred_at DESC LIMIT 50", workItemId);
    }
}
