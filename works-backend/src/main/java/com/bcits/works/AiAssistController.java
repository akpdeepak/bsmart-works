package com.bcits.works;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Iteration-11 AI capability endpoints (Caps P, O, K, M, I, N). Every endpoint is workspace-scoped
 * (RB-40 §1) and RBAC-gated here at the boundary (RB-10 §2): all callers must be workspace members
 * ({@code view_items}); the command-bar execute path additionally enforces per-action permissions
 * inside {@link AiAssistService}. Scope/budget/cache/audit and the deterministic fallback are all
 * applied centrally by {@link AiControlPlaneService} via {@link AiAssistService}.
 *
 * <p>"In-context" AI can be turned off per request via the {@code aiInContext=false} flag — the
 * fourth, most-granular scope in the hierarchy (RB-40 §2).
 */
@RestController
@RequestMapping("/api/v1/ai")
public class AiAssistController {

    private final AiAssistService assist;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public AiAssistController(AiAssistService assist, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.assist = assist;
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
        return !(v instanceof Boolean b) || b;   // default true
    }

    private static String str(Map<String, Object> body, String key) {
        Object v = body == null ? null : body.get(key);
        return v == null ? null : v.toString();
    }

    // ── Cap P · command bar ───────────────────────────────────────────────────────

    @PostMapping("/command/parse")
    public AiAssistService.ActionPlan parse(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return assist.parseCommand(workspaceId, userId, str(body, "text"), inContext(body));
    }

    @PostMapping("/command/execute")
    @SuppressWarnings("unchecked")
    public Map<String, Object> execute(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        List<Map<String, Object>> rawSteps = (List<Map<String, Object>>) body.getOrDefault("steps", List.of());
        List<AiAssistService.PlanStep> steps = rawSteps.stream().map(m -> new AiAssistService.PlanStep(
            str(m, "action"), str(m, "description"),
            (Map<String, Object>) m.getOrDefault("params", Map.of()), true)).toList();
        return assist.executePlan(workspaceId, userId, steps);
    }

    // ── Cap O · triage / generation / anomaly ─────────────────────────────────────

    @PostMapping("/triage")
    public AiAssistService.TriageSuggestion triage(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return assist.triage(workspaceId, userId, str(body, "title"), str(body, "description"),
            str(body, "projectId"), inContext(body));
    }

    @PostMapping("/generate")
    @SuppressWarnings("unchecked")
    public AiAssistService.GeneratedDraft generate(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        Map<String, Object> ctx = (Map<String, Object>) body.getOrDefault("context", Map.of());
        return assist.generate(workspaceId, userId, str(body, "kind"), ctx, inContext(body));
    }

    @PostMapping("/explain-anomaly")
    @SuppressWarnings("unchecked")
    public AiAssistService.AnomalyExplanation explainAnomaly(@RequestParam String workspaceId,
                                                             @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        List<Number> raw = (List<Number>) body.getOrDefault("series", List.of());
        List<Double> series = raw.stream().map(Number::doubleValue).toList();
        return assist.explainAnomaly(workspaceId, userId, str(body, "metric"), series, inContext(body));
    }

    // ── Cap K · compliance suggestions ─────────────────────────────────────────────

    @PostMapping("/suggest-compliance-rules")
    public Map<String, Object> suggestComplianceRules(@RequestParam String workspaceId,
                                                       @RequestBody(required = false) Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return assist.suggestComplianceRules(workspaceId, userId, inContext(body));
    }

    // ── Cap M · SLA breach prediction ──────────────────────────────────────────────

    @PostMapping("/predict-sla")
    public Map<String, Object> predictSla(@RequestParam String workspaceId,
                                          @RequestBody(required = false) Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return assist.predictSla(workspaceId, userId, str(body, "projectId"), inContext(body));
    }

    // ── Cap I / N · knowledge base + routing ───────────────────────────────────────

    @PostMapping("/kb/ask")
    public AiAssistService.KbAnswer kbAsk(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return assist.kbAsk(workspaceId, userId, str(body, "question"), inContext(body));
    }

    @PostMapping("/kb/suggest")
    public Map<String, Object> kbSuggest(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return assist.kbSuggest(workspaceId, userId, str(body, "text"), inContext(body));
    }

    @PostMapping("/route")
    public Map<String, Object> route(@RequestParam String workspaceId, @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return assist.route(workspaceId, userId, str(body, "text"), inContext(body));
    }
}
