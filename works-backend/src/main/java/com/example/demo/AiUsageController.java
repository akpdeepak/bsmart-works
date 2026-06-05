package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * AI usage dashboard (iteration 10, Cap Z / I10-S07). Read-only, workspace-scoped (RB-40 §1)
 * aggregations over {@code ai_invocations}: totals (calls, tokens, cost, fallback rate) and
 * breakdowns by user and by capability. The single source is the per-call audit row written by
 * {@link AiOrchestrationService}. Reads require workspace membership ({@code view_items}).
 */
@RestController
@RequestMapping("/api/v1/ai/usage")
public class AiUsageController {

    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public AiUsageController(JdbcTemplate jdbc, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public Map<String, Object> usage(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        Map<String, Object> out = new LinkedHashMap<>();

        Map<String, Object> totals = jdbc.queryForMap(
            "SELECT COUNT(*) AS calls, "
            + "COALESCE(SUM(tokens_in),0) AS tokens_in, "
            + "COALESCE(SUM(tokens_out),0) AS tokens_out, "
            + "COALESCE(SUM(cost),0) AS cost, "
            + "COALESCE(SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END),0) AS fallback_calls "
            + "FROM ai_invocations WHERE workspace_id = ?", workspaceId);
        out.put("totals", totals);

        out.put("byUser", jdbc.queryForList(
            "SELECT user_id, COUNT(*) AS calls, COALESCE(SUM(tokens_in+tokens_out),0) AS tokens, "
            + "COALESCE(SUM(cost),0) AS cost FROM ai_invocations "
            + "WHERE workspace_id = ? GROUP BY user_id ORDER BY cost DESC", workspaceId));

        out.put("byCapability", jdbc.queryForList(
            "SELECT capability, COUNT(*) AS calls, COALESCE(SUM(tokens_in+tokens_out),0) AS tokens, "
            + "COALESCE(SUM(cost),0) AS cost, "
            + "COALESCE(SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END),0) AS fallback_calls "
            + "FROM ai_invocations WHERE workspace_id = ? GROUP BY capability ORDER BY calls DESC",
            workspaceId));

        out.put("byTier", jdbc.queryForList(
            "SELECT model_tier, COUNT(*) AS calls FROM ai_invocations "
            + "WHERE workspace_id = ? GROUP BY model_tier ORDER BY calls DESC", workspaceId));

        return out;
    }
}
