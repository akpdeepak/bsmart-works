package com.example.demo;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Read access to the immutable metric snapshot series + an on-demand capture trigger (iteration 12,
 * Cap L). Reading aggregated history needs {@code view_team_metrics}; triggering a capture needs
 * {@code manage_metrics}. There is intentionally no update or delete endpoint — snapshots are
 * append-only (RB-10 §3). All series are aggregated scopes (TEAM/PROJECT/ORG), never individuals.
 */
@RestController
@RequestMapping("/api/v1/metrics/snapshots")
public class MetricSnapshotController {

    private final MetricSnapshotRepository snapshots;
    private final MetricSnapshotService snapshotService;
    private final RbacService rbac;
    private final AuthenticatedUser authenticatedUser;

    public MetricSnapshotController(MetricSnapshotRepository snapshots, MetricSnapshotService snapshotService,
                                    RbacService rbac, AuthenticatedUser authenticatedUser) {
        this.snapshots = snapshots;
        this.snapshotService = snapshotService;
        this.rbac = rbac;
        this.authenticatedUser = authenticatedUser;
    }

    /** Historical series for a scope. {@code metricKey} optional — omit for all metrics of the scope. */
    @GetMapping
    public List<MetricSnapshot> series(@RequestParam String workspaceId,
                                       @RequestParam(defaultValue = "ORG") String scope,
                                       @RequestParam(required = false) String scopeRef,
                                       @RequestParam(required = false) String metricKey) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_team_metrics");
        String s = scope.toUpperCase();
        if (metricKey != null && !metricKey.isBlank()) {
            return snapshots.findByWorkspaceIdAndMetricKeyAndScopeAndScopeRefOrderByPeriodStartAsc(
                workspaceId, metricKey, s, scopeRef);
        }
        if (scopeRef == null || scopeRef.isBlank()) {
            return snapshots.findByWorkspaceIdAndScopeAndScopeRefIsNullOrderByPeriodStartAsc(workspaceId, s);
        }
        return snapshots.findByWorkspaceIdAndScopeAndScopeRefOrderByPeriodStartAsc(workspaceId, s, scopeRef);
    }

    /** Freeze the current period's values now (idempotent for an already-captured period). */
    @PostMapping("/capture")
    public Map<String, Object> capture(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_metrics");
        int written = snapshotService.snapshotWorkspace(workspaceId, LocalDate.now());
        return Map.of("workspaceId", workspaceId, "snapshotsWritten", written);
    }
}
