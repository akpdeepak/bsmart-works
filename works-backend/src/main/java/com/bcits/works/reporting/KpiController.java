package com.bcits.works.reporting;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
    private final RbacGate rbac;

    public KpiController(KpiService kpi, AuthenticatedUser authenticatedUser, RbacGate rbac) {
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
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_team_metrics");
        return kpi.listDefinitions(workspaceId, userId);
    }

    @PostMapping("/definitions")
    public MetricDefinition createDefinition(@RequestParam String workspaceId,
                                             @Valid @RequestBody MetricDefinition def) {
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
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_team_metrics");
        return kpi.team(workspaceId, userId, teamId);
    }

    @GetMapping("/project")
    public KpiService.Layer project(@RequestParam String workspaceId, @RequestParam String projectId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_team_metrics");
        return kpi.project(workspaceId, userId, projectId);
    }

    @GetMapping("/manager")
    public List<KpiService.Layer> manager(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_team_metrics");
        return kpi.manager(workspaceId, userId);
    }

    @GetMapping("/org")
    public KpiService.Layer org(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_team_metrics");
        return kpi.org(workspaceId, userId);
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
    public KpiService.Narrative narrative(@RequestParam String workspaceId, @Valid @RequestBody NarrativeRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_team_metrics");
        boolean inContext = req == null || req.aiInContext() == null || req.aiInContext();
        return kpi.narrative(workspaceId, userId, req == null ? null : req.teamId(), inContext);
    }

    public record NarrativeRequest(String teamId, Boolean aiInContext) { }

    /** Snapshot history for trend charts (spec: BQL-compiled metrics are time-series, RB-10 §6). */
    @GetMapping("/history")
    public List<MetricSnapshot> history(@RequestParam String workspaceId,
                                        @RequestParam String metricKey,
                                        @RequestParam(defaultValue = "ORG") String scopeLevel,
                                        @RequestParam(required = false) String scopeId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_team_metrics");
        return kpi.history(workspaceId, metricKey, scopeLevel, scopeId);
    }

    // ── Voluntary individual sharing ────────────────────────────────────────────────

    @GetMapping("/shares")
    public List<MetricShare> shares(@RequestParam String workspaceId) {
        String caller = authenticatedUser.id();
        rbac.require(caller, workspaceId, "view_items");
        return kpi.sharesByOwner(workspaceId, caller);
    }

    public record ShareRequest(String viewerUserId) { }

    @PostMapping("/shares")
    public MetricShare share(@RequestParam String workspaceId, @Valid @RequestBody ShareRequest req) {
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
