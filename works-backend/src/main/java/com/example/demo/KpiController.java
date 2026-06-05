package com.example.demo;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * KPI Framework API (iteration 12, Cap L). Layered, privacy-guarded metrics. RBAC is enforced here
 * at the service boundary (RB-10 §2) and every endpoint is workspace-scoped (RB-40 §1):
 *
 * <ul>
 *   <li><b>Personal</b> needs only membership; another user's metrics are refused unless shared.</li>
 *   <li><b>Team / project / manager / org</b> require {@code view_team_metrics} and return only
 *       aggregated data — there is no endpoint that returns an individual's numbers to a manager.</li>
 *   <li><b>Custom metric definitions</b> require {@code manage_metrics}.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/kpi")
public class KpiController {

    private final KpiService kpi;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public KpiController(KpiService kpi, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.kpi = kpi;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    // ── Catalog + definitions ──────────────────────────────────────────────────────

    @GetMapping("/catalog")
    public List<Map<String, Object>> catalog(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return kpi.catalog();
    }

    @GetMapping("/definitions")
    public List<MetricDefinition> definitions(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_team_metrics");
        return kpi.listDefinitions(workspaceId);
    }

    @PostMapping("/definitions")
    public MetricDefinition createDefinition(@RequestParam String workspaceId,
                                             @RequestBody MetricDefinition def) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_metrics");
        return kpi.createDefinition(workspaceId, userId, def);
    }

    // ── Personal view (private; self-or-shared) ─────────────────────────────────────

    @GetMapping("/personal")
    public KpiService.Layer personal(@RequestParam String workspaceId,
                                     @RequestParam(required = false) String userId) {
        String caller = authenticatedUser.id();
        rbac.require(caller, workspaceId, "view_items");
        return kpi.personal(workspaceId, caller, userId);
    }

    // ── Aggregated views (LEAD+; never individual) ──────────────────────────────────

    @GetMapping("/team")
    public KpiService.Layer team(@RequestParam String workspaceId, @RequestParam String teamId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_team_metrics");
        return kpi.team(workspaceId, teamId);
    }

    @GetMapping("/project")
    public KpiService.Layer project(@RequestParam String workspaceId, @RequestParam String projectId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_team_metrics");
        return kpi.project(workspaceId, projectId);
    }

    @GetMapping("/manager")
    public List<KpiService.Layer> manager(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_team_metrics");
        return kpi.manager(workspaceId);
    }

    @GetMapping("/org")
    public KpiService.Layer org(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_team_metrics");
        return kpi.org(workspaceId);
    }

    @GetMapping("/health")
    public KpiService.HealthComposite health(@RequestParam String workspaceId, @RequestParam String teamId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_team_metrics");
        return kpi.health(workspaceId, teamId);
    }

    @GetMapping("/distribution")
    public KpiService.Distribution distribution(@RequestParam String workspaceId,
                                                @RequestParam(defaultValue = "ORG") String scopeLevel,
                                                @RequestParam(required = false) String scopeId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_team_metrics");
        return kpi.distribution(workspaceId, scopeLevel, scopeId);
    }

    @PostMapping("/narrative")
    public KpiService.Narrative narrative(@RequestParam String workspaceId, @RequestBody NarrativeRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_team_metrics");
        boolean inContext = req == null || req.aiInContext() == null || req.aiInContext();
        return kpi.narrative(workspaceId, userId, req == null ? null : req.teamId(), inContext);
    }

    public record NarrativeRequest(String teamId, Boolean aiInContext) { }

    // ── Voluntary individual sharing ────────────────────────────────────────────────

    @GetMapping("/shares")
    public List<MetricShare> shares(@RequestParam String workspaceId) {
        String caller = authenticatedUser.id();
        rbac.require(caller, workspaceId, "view_items");
        return kpi.sharesByOwner(workspaceId, caller);
    }

    public record ShareRequest(String viewerUserId) { }

    @PostMapping("/shares")
    public MetricShare share(@RequestParam String workspaceId, @RequestBody ShareRequest req) {
        String caller = authenticatedUser.id();
        rbac.require(caller, workspaceId, "view_items");
        if (req == null || req.viewerUserId() == null || req.viewerUserId().isBlank()) {
            throw ApiException.badRequest("MISSING_VIEWER", "viewerUserId is required.", "viewerUserId");
        }
        return kpi.share(workspaceId, caller, req.viewerUserId());
    }

    @DeleteMapping("/shares/{viewerUserId}")
    public Map<String, Object> unshare(@RequestParam String workspaceId, @PathVariable String viewerUserId) {
        String caller = authenticatedUser.id();
        rbac.require(caller, workspaceId, "view_items");
        kpi.unshare(workspaceId, caller, viewerUserId);
        return Map.of("ok", true);
    }
}
