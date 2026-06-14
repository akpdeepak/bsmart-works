package com.bcits.works;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Exposes the auto status-duration projection (iteration 7, Cap B) plus lead/cycle time for a work
 * item: {@code GET /api/v1/work-items/{id}/status-durations}. Workspace-scoped (RB-40 §1) — the
 * caller must be able to view the item's workspace. Read-only; everything is projected from the
 * event log, never manually entered.
 *
 * <p>Lead time (created → first Done) and cycle time (first In&nbsp;Progress → first Done) need each
 * status's category. Status names are categorised via the workspace's per-type status config
 * (TODO | IN_PROGRESS | DONE), with a name-heuristic fallback for legacy statuses.
 */
@RestController
@RequestMapping("/api/v1/work-items")
public class StatusDurationController {

    private final StatusDurationService statusDurations;
    private final StatusConfigService statusConfig;
    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public StatusDurationController(StatusDurationService statusDurations, StatusConfigService statusConfig,
                                    JdbcTemplate jdbc, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.statusDurations = statusDurations;
        this.statusConfig = statusConfig;
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping("/{id}/status-durations")
    public StatusDurationService.StatusTimelineMetrics forItem(@PathVariable String id) {
        String workspaceId = rbac.workspaceForWorkItem(id);
        if (workspaceId != null) {
            rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        }
        String type = null;
        try {
            type = jdbc.queryForObject("SELECT type FROM work_items WHERE id = ?", String.class, id);
        } catch (RuntimeException ignored) {}

        Map<String, String> nameToCategory = new HashMap<>();
        if (workspaceId != null && type != null) {
            for (WorkflowStatus s : statusConfig.statusesForType(workspaceId, type)) {
                if (s.getName() != null) nameToCategory.put(s.getName().toLowerCase(), s.getCategory());
            }
        }
        return statusDurations.metricsForWorkItem(id, categoryResolver(nameToCategory));
    }

    /**
     * Status name → TODO | IN_PROGRESS | DONE; config first, then a heuristic for legacy values.
     * Package-private (not private) so its mapping is pinned by a unit test — the V87 backfill
     * migration relies on the heuristic resolving 'Todo'/'In Progress'/'Done' correctly.
     */
    static Function<String, String> categoryResolver(Map<String, String> nameToCategory) {
        return name -> {
            if (name == null) return "TODO";
            String mapped = nameToCategory.get(name.toLowerCase());
            if (mapped != null) return mapped;
            String n = name.toLowerCase();
            if (n.contains("progress") || n.contains("review") || n.contains("test")
                || n.equals("blocked") || n.contains("doing")) return "IN_PROGRESS";
            if (n.equals("done") || n.contains("closed") || n.contains("resolved")
                || n.contains("complete") || n.contains("fixed")) return "DONE";
            return "TODO";
        };
    }
}
