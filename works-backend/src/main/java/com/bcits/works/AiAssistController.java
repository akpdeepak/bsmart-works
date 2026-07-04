package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
@Tag(name = "AI Assist", description = "AI Control Plane endpoints: command bar, summarisation, NL filter, story generation, and knowledge Q&A. All workspace-scoped; budget/audit via AiControlPlaneService.")
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

    // ── Cap O iter-10 · NL → BQL (iteration 10, first AI surface) ───────────────

    @Operation(summary = "Natural language → BQL",
        description = "Translates a plain-language query to BQL. The result can be previewed in the visual BQL builder before execution. Falls back to a deterministic keyword-to-BQL parser when AI is off or over budget.")
    @PostMapping("/nl-to-bql")
    public AiAssistService.NlToBqlResult nlToBql(@RequestParam String workspaceId,
                                                  @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return assist.nlToBql(workspaceId, userId, str(body, "text"), inContext(body));
    }

    @Operation(summary = "Summarize content",
        description = "Summarizes a comments thread (kind=comments, subjectId=workItemId), a project sprint (kind=sprint, subjectId=projectId), or the workspace dashboard (kind=dashboard). Falls back to a structured deterministic extract when AI is off.")
    @PostMapping("/summarize")
    public AiAssistService.SummarizeResult summarize(@RequestParam String workspaceId,
                                                      @RequestBody Map<String, Object> body) {
        String userId = requireMember(workspaceId);
        return assist.summarize(workspaceId, userId, str(body, "kind"), str(body, "subjectId"), inContext(body));
    }

    // ── Cap P · command bar ───────────────────────────────────────────────────────

    @Operation(summary = "Parse AI command", description = "Parses a natural-language command into a typed ActionPlan. The plan can then be reviewed before execution via /command/execute.")
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

    @Operation(summary = "AI triage", description = "Suggests type, priority, and assignee for a work item based on title and description. Falls back to rules engine when AI is off or over budget.")
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

    @Operation(summary = "AI Today nudges",
        description = "Returns proactive Today dashboard focus nudges. Falls back to deterministic workspace-scoped assigned-work heuristics when AI is off.")
    @GetMapping("/today-nudges")
    public AiAssistService.TodayNudgesResult todayNudges(@RequestParam String workspaceId,
                                                         @RequestParam(required = false) String userId) {
        String callerId = requireMember(workspaceId);
        String targetUserId = (userId == null || userId.isBlank()) ? callerId : userId;
        return assist.todayNudges(workspaceId, callerId, targetUserId, true);
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
