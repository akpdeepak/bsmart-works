package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

/**
 * Iteration-15 AI + analytics endpoints for the Scrum Master cockpit (Cap V) and Product Owner
 * workspace (Cap W). Every endpoint is workspace-scoped (RB-40 §1) and RBAC-gated here at the
 * boundary (RB-10 §2 — all callers must be members, {@code view_items}); scope/budget/cache/audit
 * and the deterministic fallback are applied centrally by {@link AiControlPlaneService} via
 * {@link Iteration15AiService}. "In-context" AI is toggled per request via {@code aiInContext}.
 */
@RestController
@RequestMapping("/api/v1")
public class Iteration15AiController {

    private final Iteration15AiService service;
    private final SprintVarianceService varianceService;
    private final CockpitCoachService coachService;
    private final CockpitDigestService digestService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public Iteration15AiController(Iteration15AiService service, SprintVarianceService varianceService,
                                   CockpitCoachService coachService, CockpitDigestService digestService,
                                   AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.service = service;
        this.varianceService = varianceService;
        this.coachService = coachService;
        this.digestService = digestService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    private String requireMember(String workspaceId) {
        String userId = authenticatedUser.id();
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, workspaceId, "view_items");
        return userId;
    }

    private static boolean inContext(Map<String, Object> body) {
        Object v = body == null ? null : body.get("aiInContext");
        return !(v instanceof Boolean b) || b; // default true
    }

    private static String str(Map<String, Object> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v == null ? null : v.toString();
    }

    private static Integer intOrNull(Map<String, Object> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v instanceof Number n ? n.intValue() : null;
    }

    // ── Cap V · Scrum Master cockpit ─────────────────────────────────────────────

    @PostMapping("/cockpit/sprint-planning")
    public Map<String, Object> sprintPlanning(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return service.sprintPlanningHelper(workspaceId, userId, str(body, "projectId"),
            intOrNull(body, "timeOffPoints"), inContext(body));
    }

    @GetMapping("/cockpit/risk-panel")
    public Map<String, Object> riskPanel(@RequestParam String workspaceId, @RequestParam String sprintId) {
        String userId = requireMember(workspaceId);
        return service.midSprintRiskPanel(workspaceId, userId, sprintId);
    }

    @GetMapping("/cockpit/digest")
    public Map<String, Object> digest(@RequestParam String workspaceId, @RequestParam String projectId) {
        String userId = requireMember(workspaceId);
        return digestService.digest(workspaceId, userId, projectId);
    }

    @PostMapping("/cockpit/pro-tips")
    public Map<String, Object> proTips(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return coachService.proTips(workspaceId, userId, str(body, "projectId"), inContext(body));
    }

    @PostMapping("/cockpit/retro-cluster")
    public Map<String, Object> retroCluster(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return coachService.clusterRetro(workspaceId, userId, str(body, "retroId"), inContext(body));
    }

    @GetMapping("/cockpit/variance")
    public Map<String, Object> variance(@RequestParam String workspaceId, @RequestParam String sprintId) {
        String userId = requireMember(workspaceId);
        return varianceService.variance(workspaceId, userId, sprintId);
    }

    @PostMapping("/cockpit/review-prep")
    public Map<String, Object> reviewPrep(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return service.sprintReviewPrep(workspaceId, userId, str(body, "sprintId"), inContext(body));
    }

    @PostMapping("/cockpit/patterns")
    public Map<String, Object> patterns(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return service.crossSprintPatterns(workspaceId, userId, str(body, "projectId"), inContext(body));
    }

    // ── Cap W · Product Owner workspace ──────────────────────────────────────────

    @PostMapping("/po/backlog-refine")
    public Map<String, Object> backlogRefine(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return service.backlogRefinement(workspaceId, userId, str(body, "projectId"), inContext(body));
    }

    @PostMapping("/po/feedback-cluster")
    public Map<String, Object> feedbackCluster(@RequestParam String workspaceId,
                                               @RequestBody(required = false) Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return service.clusterFeedback(workspaceId, userId, inContext(body));
    }

    @PostMapping("/po/release-notes")
    public Map<String, Object> releaseNotes(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return service.draftReleaseNotes(workspaceId, userId, str(body, "projectId"),
            str(body, "releaseName"), inContext(body));
    }
}
