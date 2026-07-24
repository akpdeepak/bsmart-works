package com.bcits.works.reporting;
import com.bcits.works.workspaces.api.Workspace;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.RbacGate;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * WI-10 — internal HEART/funnel metrics for the dogfood admin dashboard (HEART-METRICS.md §7).
 *
 * <p>Platform-level analytics: aggregates funnel event counts across all workspaces. The caller
 * must be ADMIN-tier in the <b>configured internal workspace</b> ({@code metrics.internal-workspace-id}),
 * matching the design in HEART-METRICS.md §7 ("role: ADMIN within the bSmart Works workspace used
 * internally"). Admin tier in the caller's own tenant is deliberately NOT sufficient — the gate is
 * against the internal workspace specifically, so a customer admin cannot read platform-wide
 * activation counts. The cross-workspace query is intentional for this platform-ops surface and is
 * distinct from the per-tenant tenant-isolation requirement (RB-40 §1).
 */
@Service
public class FunnelMetricsService {

    private static final String[] FUNNEL_TYPES = {
        "WORKSPACE_TEMPLATE_APPLIED",
        "WORKSPACE_FIRST_VALUE",
        "WORKSPACE_TEAMMATE_INVITED",
        "WORKSPACE_DAY_2_RETURN",
    };

    private static final String[] MEANINGFUL_ACTION_TYPES = {
        "WORK_ITEM_CREATED", "STATUS_CHANGED", "COMMENT_ADDED",
        "SPRINT_ITEM_ADDED", "SPRINT_ITEM_REMOVED", "REPORT_CREATED",
        "BQL_RUN", "WORKSPACE_TEAMMATE_INVITED",
    };

    private final RbacGate rbac;
    private final JdbcTemplate jdbc;
    private final String internalWorkspaceId;

    public FunnelMetricsService(RbacGate rbac, JdbcTemplate jdbc,
                                @Value("${metrics.internal-workspace-id:}") String internalWorkspaceId) {
        this.rbac = rbac;
        this.jdbc = jdbc;
        this.internalWorkspaceId = internalWorkspaceId;
    }

    /**
     * Returns HEART activation-funnel metrics for the internal admin dashboard.
     * Requires ADMIN tier in the requesting workspace (non-member sees 404; non-admin sees 403).
     */
    public Map<String, Object> heartMetrics(String callerId, String workspaceId) {
        requireAdmin(callerId, workspaceId);

        int total = total();
        Map<String, Integer> stepCounts = funnelStepCounts();

        int templateApplied = stepCounts.getOrDefault("WORKSPACE_TEMPLATE_APPLIED", 0);
        int firstValue      = stepCounts.getOrDefault("WORKSPACE_FIRST_VALUE", 0);
        int invited         = stepCounts.getOrDefault("WORKSPACE_TEAMMATE_INVITED", 0);
        int day2Return      = stepCounts.getOrDefault("WORKSPACE_DAY_2_RETURN", 0);

        List<Map<String, Object>> steps = new ArrayList<>();
        steps.add(funnelStep(2, "Template applied",  "WORKSPACE_TEMPLATE_APPLIED",  templateApplied, total));
        steps.add(funnelStep(3, "First value",        "WORKSPACE_FIRST_VALUE",        firstValue,      total));
        steps.add(funnelStep(4, "Teammate invited",   "WORKSPACE_TEAMMATE_INVITED",   invited,         total));
        steps.add(funnelStep(5, "Day-2 return",       "WORKSPACE_DAY_2_RETURN",       day2Return,      total));

        int firstValue7d = firstValue7d();

        Map<String, Object> rates = new HashMap<>();
        rates.put("firstValueRate7d",     rate(firstValue7d, total));
        rates.put("templateAdoptionRate", rate(templateApplied, total));
        rates.put("teammateInviteRate",   rate(invited, total));
        rates.put("day2ReturnRate",       rate(day2Return, total));

        Map<String, Object> engagement = new HashMap<>();
        engagement.put("meaningfulActions7d",  meaningfulActionCount(7));
        engagement.put("meaningfulActions30d", meaningfulActionCount(30));

        Map<String, Object> result = new HashMap<>();
        result.put("totalWorkspaces", total);
        result.put("funnelSteps",     steps);
        result.put("rates",           rates);
        result.put("engagement",      engagement);
        return result;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Gate for the platform-ops surface. The queries below aggregate across EVERY workspace, so the
     * check is deliberately against the configured internal (dogfood) workspace — not whichever
     * workspace the caller names. Admin tier in one's own tenant confers no access here, otherwise
     * any customer admin could read platform-wide activation counts (HEART-METRICS.md §7).
     * Unconfigured {@code metrics.internal-workspace-id} fails closed.
     */
    private void requireAdmin(String callerId, String wsId) {
        if (internalWorkspaceId == null || internalWorkspaceId.isBlank()
                || wsId == null || !internalWorkspaceId.equals(wsId)
                || rbac.getUserTier(callerId, internalWorkspaceId) < 1) {
            throw ApiException.notFound("Workspace", wsId);
        }
        if (!rbac.isAdmin(callerId, internalWorkspaceId)) {
            throw ApiException.forbidden("HEART dashboard requires workspace administrator access.");
        }
    }

    private int total() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM workspaces", Integer.class);
        return count == null ? 0 : count;
    }

    private Map<String, Integer> funnelStepCounts() {
        String inClause = String.join(",", java.util.Collections.nCopies(FUNNEL_TYPES.length, "?"));
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT event_type, COUNT(DISTINCT workspace_id) AS ws_count FROM events WHERE event_type IN (" + inClause + ") GROUP BY event_type",
            (Object[]) FUNNEL_TYPES
        );
        Map<String, Integer> counts = new HashMap<>();
        for (Map<String, Object> row : rows) {
            counts.put((String) row.get("event_type"), ((Number) row.get("ws_count")).intValue());
        }
        return counts;
    }

    private int firstValue7d() {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(DISTINCT e.workspace_id) FROM events e JOIN workspaces w ON w.id = e.workspace_id WHERE e.event_type = 'WORKSPACE_FIRST_VALUE' AND e.occurred_at <= w.created_at + INTERVAL '7 days'",
            Integer.class
        );
        return count == null ? 0 : count;
    }

    private long meaningfulActionCount(int days) {
        String inClause = String.join(",", java.util.Collections.nCopies(MEANINGFUL_ACTION_TYPES.length, "?"));
        Object[] params = new Object[MEANINGFUL_ACTION_TYPES.length + 1];
        System.arraycopy(MEANINGFUL_ACTION_TYPES, 0, params, 0, MEANINGFUL_ACTION_TYPES.length);
        params[MEANINGFUL_ACTION_TYPES.length] = days;
        Long count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM events WHERE event_type IN (" + inClause + ") AND occurred_at >= NOW() - INTERVAL '1 day' * ?",
            Long.class, params
        );
        return count == null ? 0L : count;
    }

    private static Map<String, Object> funnelStep(int step, String name, String eventType, int count, int total) {
        Map<String, Object> m = new HashMap<>();
        m.put("step", step);
        m.put("name", name);
        m.put("eventType", eventType);
        m.put("count", count);
        m.put("rate", rate(count, total));
        return m;
    }

    private static double rate(int numerator, int denominator) {
        return denominator == 0 ? 0.0 : Math.round(numerator * 10000.0 / denominator) / 10000.0;
    }
}
