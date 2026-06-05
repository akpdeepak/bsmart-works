package com.example.demo;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * The layered KPI dashboards (iteration 12, Cap L): Individual / Team / Project / Manager / Org.
 * RBAC lives here in the service boundary, never the UI (RB-10 §2): the personal layer needs only
 * workspace membership; team/project/manager layers need {@code view_team_metrics}; the org/executive
 * layer needs {@code view_org_metrics}. All privacy invariants — no individual access above the
 * personal layer, the anonymity floor, voluntary-share gating — are enforced in {@link KpiService} /
 * {@link KpiPrivacyService}, so they hold for every caller, UI or API.
 */
@RestController
@RequestMapping("/api/v1/kpi")
public class KpiController {

    private final KpiService kpi;
    private final KpiPrivacyService privacy;
    private final RbacService rbac;
    private final AuthenticatedUser authenticatedUser;

    public KpiController(KpiService kpi, KpiPrivacyService privacy, RbacService rbac,
                         AuthenticatedUser authenticatedUser) {
        this.kpi = kpi;
        this.privacy = privacy;
        this.rbac = rbac;
        this.authenticatedUser = authenticatedUser;
    }

    /**
     * The unified layered view. {@code userId} is honored only on the PERSONAL layer (your own, or a
     * person who has shared with you); passing it on any aggregated layer is rejected 403 by the guard.
     */
    @GetMapping("/view")
    public Map<String, Object> view(@RequestParam String workspaceId,
                                    @RequestParam(defaultValue = "PERSONAL") String layer,
                                    @RequestParam(required = false) String projectId,
                                    @RequestParam(required = false) String teamId,
                                    @RequestParam(required = false) String userId) {
        String requester = authorizeLayer(workspaceId, layer);
        return kpi.buildView(layer, requester, workspaceId, projectId, teamId, userId);
    }

    @GetMapping("/team-health")
    public Map<String, Object> teamHealth(@RequestParam String workspaceId,
                                          @RequestParam(defaultValue = "TEAM") String layer,
                                          @RequestParam(required = false) String projectId,
                                          @RequestParam(required = false) String teamId) {
        String requester = authorizeLayer(workspaceId, layer);
        return kpi.teamHealth(layer, requester, workspaceId, projectId, teamId);
    }

    @GetMapping("/cycle-time")
    public Map<String, Object> cycleTime(@RequestParam String workspaceId,
                                         @RequestParam(defaultValue = "TEAM") String layer,
                                         @RequestParam(required = false) String projectId,
                                         @RequestParam(required = false) String teamId,
                                         @RequestParam(required = false) String userId) {
        String requester = authorizeLayer(workspaceId, layer);
        // userId is the *target* (own data, or someone who shared with me) — never the requester, so the
        // share-gate runs as assertCanViewPersonal(requester, target). Aggregated layers reject it (403).
        return kpi.cycleTimeDistribution(layer, requester, workspaceId, projectId, teamId, userId);
    }

    /** The effective per-workspace privacy policy (read by any member, for the UI banner). */
    @GetMapping("/settings")
    public WorkspaceKpiSettings settings(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return kpi.settings(workspaceId);
    }

    /** Update the per-workspace privacy policy (admin only) — can only tighten, never loosen. */
    @PutMapping("/settings")
    public WorkspaceKpiSettings updateSettings(@RequestParam String workspaceId,
                                               @RequestBody Map<String, Object> body) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_roles");
        Integer minSize = body.get("minAggregationSize") instanceof Number n ? n.intValue() : null;
        Boolean locked = body.get("individualComparisonLocked") instanceof Boolean b ? b : null;
        return kpi.saveSettings(workspaceId, minSize, locked);
    }

    /**
     * Authorize the request for the requested layer and return the requester id. The personal layer's
     * deeper check (own vs shared) happens in the service where the share list is available.
     */
    private String authorizeLayer(String workspaceId, String layer) {
        String userId = authenticatedUser.id();
        String permission = privacy.requiredPermission(layer);
        if (permission == null) {
            rbac.require(userId, workspaceId, "view_items"); // PERSONAL — membership only
        } else {
            rbac.require(userId, workspaceId, permission);
        }
        return userId;
    }
}
