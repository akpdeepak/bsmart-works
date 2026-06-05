package com.example.demo;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * AI budget caps (iteration 10, Cap Z / I10-S06). Admin sets a per-workspace monthly cap; usage
 * accrues from {@link AiInvocation} costs (written by {@link AiOrchestrationService}). The derived
 * state drives cost discipline (RB-40 §2): &lt;80% NORMAL, 80% DEGRADED (Haiku), 100% DISABLED
 * (fallback only) — computed by the pure {@link AiBudgetService}. Setting the cap is gated by
 * {@code manage_ai}; reading the budget requires workspace membership ({@code view_items}).
 */
@RestController
@RequestMapping("/api/v1/ai/budget")
public class AiBudgetController {

    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("yyyy-MM");

    private final AiBudgetRepository budgets;
    private final AiBudgetService budgetService;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public AiBudgetController(AiBudgetRepository budgets, AiBudgetService budgetService,
                             EventService eventService, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.budgets = budgets;
        this.budgetService = budgetService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** The current month's budget for a workspace: cap, spent, consumed %, derived state + thresholds. */
    @GetMapping
    public Map<String, Object> get(@RequestParam String workspaceId,
                                   @RequestParam(required = false) String month) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        String period = month == null || month.isBlank() ? currentMonth() : month;
        AiBudget budget = budgets.findByWorkspaceIdAndPeriodMonth(workspaceId, period)
            .orElseGet(() -> emptyBudget(workspaceId, period));
        AiBudgetService.State state = budgetService.state(budget.getCapAmount(), budget.getSpentAmount());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("workspaceId", workspaceId);
        out.put("periodMonth", period);
        out.put("capAmount", budget.getCapAmount());
        out.put("spentAmount", budget.getSpentAmount());
        out.put("currency", budget.getCurrency());
        out.put("consumedPercent", budgetService.consumedPercent(budget.getCapAmount(), budget.getSpentAmount()));
        out.put("state", state.name());
        out.put("degradeAtPercent", AiBudgetService.DEGRADE_AT_PERCENT);
        out.put("disableAtPercent", AiBudgetService.DISABLE_AT_PERCENT);
        return out;
    }

    /** Set this month's cap (I10-S06). Admin-only via {@code manage_ai}. */
    @PutMapping
    public AiBudget setCap(@Valid @RequestBody Map<String, Object> body) {
        String workspaceId = required(body);
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_ai");
        BigDecimal cap = parseAmount(body.get("capAmount"));
        if (cap.signum() < 0) {
            throw ApiException.badRequest("INVALID_CAP", "capAmount must be zero or positive.");
        }
        String period = body.get("periodMonth") == null || body.get("periodMonth").toString().isBlank()
            ? currentMonth() : body.get("periodMonth").toString();
        AiBudget budget = budgets.findByWorkspaceIdAndPeriodMonth(workspaceId, period)
            .orElseGet(() -> emptyBudget(workspaceId, period));
        budget.setCapAmount(cap);
        if (body.get("currency") != null && !body.get("currency").toString().isBlank()) {
            budget.setCurrency(body.get("currency").toString());
        }
        budget.setUpdatedBy(userId);
        budget.setUpdatedAt(OffsetDateTime.now());
        AiBudget saved = budgets.save(budget);
        eventService.record(workspaceId, "AI_BUDGET_CAP_SET", userId,
            Map.of("periodMonth", period, "capAmount", cap.toPlainString()));
        return saved;
    }

    private AiBudget emptyBudget(String workspaceId, String period) {
        AiBudget b = new AiBudget();
        b.setId("AIBG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        b.setWorkspaceId(workspaceId);
        b.setPeriodMonth(period);
        b.setCapAmount(BigDecimal.ZERO);
        b.setSpentAmount(BigDecimal.ZERO);
        b.setCurrency("INR");
        return b;
    }

    private BigDecimal parseAmount(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(value.toString().trim());
        } catch (NumberFormatException ex) {
            throw ApiException.badRequest("INVALID_CAP", "capAmount must be a number.");
        }
    }

    private String required(Map<String, Object> body) {
        Object v = body.get("workspaceId");
        String s = v == null ? "" : v.toString();
        if (s.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        return s;
    }

    private String currentMonth() {
        return OffsetDateTime.now(ZoneOffset.UTC).format(MONTH);
    }
}
