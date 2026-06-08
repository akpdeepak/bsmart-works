package com.bcits.works;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

/**
 * Exposes the auto status-duration projection (iteration 7, Cap B) for a work item:
 * {@code GET /api/v1/work-items/{id}/status-durations}. Workspace-scoped (RB-40 §1) — the caller
 * must be able to view the item's workspace. Read-only; the data is projected from the event log,
 * never manually entered.
 */
@RestController
@RequestMapping("/api/v1/work-items")
public class StatusDurationController {

    private final StatusDurationService statusDurations;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public StatusDurationController(StatusDurationService statusDurations,
                                    AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.statusDurations = statusDurations;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping("/{id}/status-durations")
    public List<StatusDurationService.StatusDuration> forItem(@PathVariable String id) {
        String workspaceId = rbac.workspaceForWorkItem(id);
        if (workspaceId != null) {
            rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        }
        return statusDurations.forWorkItem(id);
    }
}
