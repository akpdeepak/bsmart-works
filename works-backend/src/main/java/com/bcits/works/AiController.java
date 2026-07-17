package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.PageResponse;
import com.bcits.works.reporting.DashboardSuggestionService;
import com.bcits.works.reporting.DashboardSummaryService;
import com.bcits.works.ai.AiBudget;
import com.bcits.works.ai.AiControlPlaneService;
import com.bcits.works.ai.AiInvocation;
import com.bcits.works.ai.AiInvocationRepository;
import com.bcits.works.ai.AiPolicy;
import com.bcits.works.ai.AiWorkspaceSettings;
import com.bcits.works.ai.AiWorkspaceSettingsService;

import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * AI Control Plane management API (RB-40 §2): scope policies, the per-workspace budget, the audit
 * log, and the capability catalogue. Reads require workspace membership; all writes and the audit
 * log require {@code manage_ai} (ADMIN). RBAC is enforced here at the service boundary (RB-10 §2),
 * and every endpoint is workspace-scoped (RB-40 §1) so one tenant can never read or alter another's
 * AI configuration or spend.
 */
@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    private final AiControlPlaneService controlPlane;
    private final AiInvocationRepository invocations;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;
    private final AiWorkspaceSettingsService settingsService;
    private final DashboardSummaryService dashboardSummary;
    private final DashboardSuggestionService dashboardSuggestion;

    public AiController(AiControlPlaneService controlPlane, AiInvocationRepository invocations,
                        AuthenticatedUser authenticatedUser, RbacGate rbac,
                        AiWorkspaceSettingsService settingsService,
                        DashboardSummaryService dashboardSummary,
                        DashboardSuggestionService dashboardSuggestion) {
        this.controlPlane = controlPlane;
        this.invocations = invocations;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.settingsService = settingsService;
        this.dashboardSummary = dashboardSummary;
        this.dashboardSuggestion = dashboardSuggestion;
    }

    /** The capability catalogue with each capability's effective enabled state for the caller and
     *  its documented deterministic fallback — drives the "what AI can do here" panel (RB-40 §2). */
    @GetMapping("/capabilities")
    public List<Map<String, Object>> capabilities(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return AiCapabilities.all().stream().map(d -> Map.<String, Object>of(
            "id", d.id(),
            "label", d.label(),
            "defaultTier", d.defaultTier().name(),
            "fallback", d.fallback(),
            "enabled", controlPlane.resolve(workspaceId, d.id(), userId, true).enabled()
        )).toList();
    }

    @GetMapping("/policies")
    public List<AiPolicy> policies(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return controlPlane.listPolicies(workspaceId);
    }

    public record PolicyRequest(String scopeType, String capability, String userId, boolean enabled) { }

    @PutMapping("/policies")
    public AiPolicy setPolicy(@RequestParam String workspaceId, @Valid @RequestBody PolicyRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_ai");
        String scope = req.scopeType() == null ? "" : req.scopeType().toUpperCase();
        if (!List.of("WORKSPACE", "CAPABILITY", "USER").contains(scope)) {
            throw ApiException.badRequest("INVALID_SCOPE", "scopeType must be WORKSPACE, CAPABILITY or USER.");
        }
        if ("CAPABILITY".equals(scope) && !AiCapabilities.isKnown(req.capability())) {
            throw ApiException.badRequest("UNKNOWN_CAPABILITY", "Unknown AI capability: " + req.capability());
        }
        return controlPlane.setPolicy(workspaceId, scope, req.capability(), req.userId(), req.enabled());
    }

    @GetMapping("/budget")
    public AiControlPlaneService.BudgetStatus budget(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return controlPlane.budgetStatus(workspaceId);
    }

    public record BudgetRequest(long monthlyCapCents) { }

    @PutMapping("/budget")
    public AiBudget setBudget(@RequestParam String workspaceId, @Valid @RequestBody BudgetRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_ai");
        if (req.monthlyCapCents() < 0) {
            throw ApiException.badRequest("INVALID_CAP", "monthlyCapCents must be >= 0.");
        }
        return controlPlane.setBudgetCap(workspaceId, req.monthlyCapCents());
    }

    /** The workspace's default model tier + data-boundary flags (mockup 09). Defaults if unset. */
    @GetMapping("/settings")
    public AiWorkspaceSettings settings(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return settingsService.get(workspaceId);
    }

    public record SettingsRequest(String defaultModelTier, boolean blockPii, boolean blockFinancial) { }

    @PutMapping("/settings")
    public AiWorkspaceSettings setSettings(@RequestParam String workspaceId, @Valid @RequestBody SettingsRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_ai");
        return settingsService.set(workspaceId, req.defaultModelTier(), req.blockPii(), req.blockFinancial());
    }

    @GetMapping("/invocations")
    public PageResponse<AiInvocation> auditLog(@RequestParam String workspaceId,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "50") int size) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_ai");   // the audit log is admin-only
        return PageResponse.of(invocations.findByWorkspaceIdOrderByCreatedAtDesc(
            workspaceId, PageRequest.of(Math.max(0, page), Math.min(200, Math.max(1, size)))));
    }

    /** Cap J — AI summary + anomaly explanation over an already-rendered chart/dashboard series.
     *  The client passes the data it already aggregated; the server never re-queries work items.
     *  RBAC ({@code view_items}) + the deterministic fallback live in {@link DashboardSummaryService}. */
    public record DashboardSummaryRequest(String title, List<Map<String, Object>> series, Boolean aiInContext) { }

    @PostMapping("/dashboard-summary")
    public DashboardSummaryService.Summary dashboardSummary(@RequestParam String workspaceId,
                                                            @RequestBody(required = false) DashboardSummaryRequest req) {
        String userId = authenticatedUser.id();
        boolean inContext = req == null || req.aiInContext() == null || req.aiInContext();
        List<DashboardSummaryService.Point> series =
            DashboardSummaryService.toSeries(req == null ? null : req.series());
        return dashboardSummary.summarize(workspaceId, userId, req == null ? null : req.title(), series, inContext);
    }

    /** Cap J — AI-suggested starter dashboard from the caller's role + workspace context
     *  (INSIGHTS-AI-ALIGNMENT-REVIEW §2.2). RBAC ({@code view_items}) + the deterministic role-based
     *  starter set (the mandatory fallback) live in {@link DashboardSuggestionService}. */
    public record DashboardSuggestionRequest(String role, Boolean aiInContext) { }

    @PostMapping("/dashboard-suggestions")
    public DashboardSuggestionService.Suggestion dashboardSuggestions(@RequestParam String workspaceId,
                                                                      @RequestBody(required = false)
                                                                      DashboardSuggestionRequest req) {
        String userId = authenticatedUser.id();
        boolean inContext = req == null || req.aiInContext() == null || req.aiInContext();
        return dashboardSuggestion.suggest(workspaceId, userId, req == null ? null : req.role(), inContext);
    }
}
