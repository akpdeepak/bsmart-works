package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cap X · Leadership Console (iteration 16). The cross-team rollup surface for BCITS leadership —
 * aggregated, permission-aware reads over data that already exists (work_items via projects, teams,
 * risk, customer_accounts + service_requests + sla_instances + csat_responses, objectives /
 * key_results / okr_links, roadmap_themes). No new domain state of its own; the AI executive briefing
 * and board deck live in {@link Iteration16AiService}.
 *
 * <p>Tenant isolation (RB-40 §1): every query is workspace-scoped — work_items are reached only via
 * {@code projects.workspace_id = ?}, so a leader can never roll up another tenant's delivery. RBAC
 * (RB-10 §2) lives here: the console requires workspace membership with {@code view_items}.
 */
@Service
public class LeadershipService {

    private final JdbcTemplate jdbc;
    private final RbacGate rbac;

    public LeadershipService(JdbcTemplate jdbc, RbacGate rbac) {
        this.jdbc = jdbc;
        this.rbac = rbac;
    }

    private void requireConsole(String callerId, String wsId) {
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Workspace", wsId);
        }
        rbac.require(callerId, wsId, "view_items");
    }

    // ── Cap X · Cross-team rollup dashboard ──────────────────────────────────────
    public Map<String, Object> crossTeamRollup(String callerId, String workspaceId) {
        requireConsole(callerId, workspaceId);

        Map<String, Object> totals = jdbc.queryForMap(
            "SELECT COUNT(*) AS total, "
            + "COUNT(*) FILTER (WHERE wi.status = 'Done') AS done, "
            + "COUNT(*) FILTER (WHERE wi.status = 'In Progress') AS in_progress, "
            + "COUNT(*) FILTER (WHERE wi.status NOT IN ('Done')) AS open, "
            + "COUNT(*) FILTER (WHERE wi.assignee_id IS NULL AND wi.status <> 'Done') AS unassigned, "
            + "COUNT(*) FILTER (WHERE wi.due_date IS NOT NULL AND wi.due_date < CURRENT_DATE AND wi.status <> 'Done') AS overdue "
            + "FROM work_items wi JOIN projects p ON p.id = wi.project_id "
            + "WHERE p.workspace_id = ? AND wi.deleted_at IS NULL", workspaceId);

        List<Map<String, Object>> perProject = jdbc.queryForList(
            "SELECT p.id, p.name, "
            + "COUNT(wi.id) AS total, "
            + "COUNT(wi.id) FILTER (WHERE wi.status = 'Done') AS done, "
            + "COUNT(wi.id) FILTER (WHERE wi.status = 'In Progress') AS in_progress, "
            + "COUNT(wi.id) FILTER (WHERE wi.status NOT IN ('Done')) AS open, "
            + "COUNT(wi.id) FILTER (WHERE wi.due_date IS NOT NULL AND wi.due_date < CURRENT_DATE AND wi.status <> 'Done') AS overdue "
            + "FROM projects p LEFT JOIN work_items wi ON wi.project_id = p.id AND wi.deleted_at IS NULL "
            + "WHERE p.workspace_id = ? AND COALESCE(p.is_archived, FALSE) = FALSE "
            + "GROUP BY p.id, p.name ORDER BY total DESC", workspaceId);
        for (Map<String, Object> row : perProject) {
            row.put("completionRate", completion(row.get("done"), row.get("total")));
        }

        List<Map<String, Object>> teams = jdbc.queryForList(
            "SELECT id, name, COALESCE(JSONB_ARRAY_LENGTH(project_ids), 0) AS project_count "
            + "FROM teams WHERE workspace_id = ? ORDER BY name", workspaceId);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totals", totals);
        out.put("completionRate", completion(totals.get("done"), totals.get("total")));
        out.put("projects", perProject);
        out.put("teams", teams);
        return out;
    }

    // ── Cap X · Resource allocation view ─────────────────────────────────────────
    public Map<String, Object> resourceAllocation(String callerId, String workspaceId) {
        requireConsole(callerId, workspaceId);

        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT u.id, u.full_name, "
            + "COUNT(wi.id) FILTER (WHERE wi.status <> 'Done') AS open_items, "
            + "COUNT(wi.id) FILTER (WHERE wi.status = 'In Progress') AS in_progress_items, "
            + "COALESCE(SUM(wi.story_points) FILTER (WHERE wi.status <> 'Done'), 0) AS open_points "
            + "FROM work_items wi "
            + "JOIN projects p ON p.id = wi.project_id "
            + "JOIN users u ON u.id = wi.assignee_id "
            + "WHERE p.workspace_id = ? AND wi.deleted_at IS NULL "
            + "GROUP BY u.id, u.full_name ORDER BY open_items DESC", workspaceId);

        long unassigned = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items wi JOIN projects p ON p.id = wi.project_id "
            + "WHERE p.workspace_id = ? AND wi.deleted_at IS NULL AND wi.assignee_id IS NULL AND wi.status <> 'Done'",
            Long.class, workspaceId);

        double mean = rows.stream().mapToLong(r -> ((Number) r.get("open_items")).longValue()).average().orElse(0);
        List<Map<String, Object>> suggestions = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            long open = ((Number) r.get("open_items")).longValue();
            String state = allocationState(open, mean);
            r.put("allocation", state);
            if ("OVER".equals(state)) {
                suggestions.add(Map.of("userId", r.get("id"), "fullName", r.get("full_name"),
                    "openItems", open, "suggestion", "Over-allocated vs team average — consider rebalancing work."));
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("members", rows);
        out.put("unassignedItems", unassigned);
        out.put("teamAverageOpen", Math.round(mean * 10.0) / 10.0);
        out.put("rebalancingSuggestions", suggestions);
        return out;
    }

    /** Over-allocated when >50% above the team mean (and at least 3 items); under when <50% of it. Pure. */
    static String allocationState(long openItems, double mean) {
        if (mean <= 0) return "BALANCED";
        if (openItems >= 3 && openItems > mean * 1.5) return "OVER";
        if (openItems < mean * 0.5) return "UNDER"; {
        return "BALANCED";
        }
    }

    // ── Cap X · Risk portfolio (aggregated from RAID logs) ───────────────────────
    public Map<String, Object> riskPortfolio(String callerId, String workspaceId) {
        requireConsole(callerId, workspaceId);

        List<Map<String, Object>> risks = jdbc.queryForList(
            "SELECT r.id, r.title, r.project_id, pr.name AS project_name, r.category, "
            + "r.probability, r.impact, r.status, r.owner_id, u.full_name AS owner_name "
            + "FROM risk r LEFT JOIN projects pr ON pr.id = r.project_id LEFT JOIN users u ON u.id = r.owner_id "
            + "WHERE r.workspace_id = ? AND r.deleted_at IS NULL "
            + "AND r.status NOT IN ('CLOSED', 'Closed', 'RESOLVED', 'Resolved')", workspaceId);

        for (Map<String, Object> r : risks) {
            r.put("score", riskScore(String.valueOf(r.get("probability")), String.valueOf(r.get("impact"))));
        }
        risks.sort((a, b) -> ((Integer) b.get("score")).compareTo((Integer) a.get("score")));

        Map<String, Integer> byStatus = new LinkedHashMap<>();
        for (Map<String, Object> r : risks) {
            byStatus.merge(String.valueOf(r.get("status")), 1, Integer::sum);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("risks", risks);
        out.put("openCount", risks.size());
        out.put("highImpactCount", risks.stream().filter(r -> ((Integer) r.get("score")) >= 6).count());
        out.put("byStatus", byStatus);
        return out;
    }

    /** Impact × probability on a 1–3 scale → 1–9 score. Pure. */
    static int riskScore(String probability, String impact) {
        return level(probability) * level(impact);
    }

    private static int level(String v) {
        if (v == null) return 1;
        return switch (v.trim().toLowerCase()) {
            case "high", "critical", "highest" -> 3;
            case "medium", "moderate" -> 2;
            default -> 1;
        };
    }

    // ── Cap X · Customer health dashboard ────────────────────────────────────────
    public Map<String, Object> customerHealth(String callerId, String workspaceId) {
        requireConsole(callerId, workspaceId);

        List<Map<String, Object>> accounts = jdbc.queryForList(
            "SELECT id, name, tier FROM customer_accounts WHERE workspace_id = ? AND active = TRUE ORDER BY name",
            workspaceId);

        List<Map<String, Object>> health = new ArrayList<>();
        for (Map<String, Object> acct : accounts) {
            String acctId = String.valueOf(acct.get("id"));
            Map<String, Object> req = jdbc.queryForMap(
                "SELECT COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED','CLOSED')) AS open_requests, "
                + "COUNT(*) FILTER (WHERE sla_due_at IS NOT NULL AND sla_due_at < NOW() "
                + "AND status NOT IN ('RESOLVED','CLOSED')) AS overdue_requests, "
                + "COUNT(*) AS total_requests "
                + "FROM service_requests WHERE workspace_id = ? AND customer_account_id = ?",
                workspaceId, acctId);
            Double avgCsat = jdbc.queryForObject(
                "SELECT AVG(rating) FROM csat_responses WHERE workspace_id = ? AND customer_account_id = ?",
                Double.class, workspaceId, acctId);

            long open = ((Number) req.get("open_requests")).longValue();
            long overdue = ((Number) req.get("overdue_requests")).longValue();
            double csat = avgCsat == null ? 0 : avgCsat;
            int score = healthScore(csat, overdue, open);

            Map<String, Object> row = new LinkedHashMap<>(acct);
            row.put("openRequests", open);
            row.put("overdueRequests", overdue);
            row.put("totalRequests", req.get("total_requests"));
            row.put("avgCsat", avgCsat == null ? null : Math.round(csat * 10.0) / 10.0);
            row.put("healthScore", score);
            row.put("churnRisk", score < 50 ? "HIGH" : score < 75 ? "MEDIUM" : "LOW");
            health.add(row);
        }
        health.sort((a, b) -> ((Integer) a.get("healthScore")).compareTo((Integer) b.get("healthScore")));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("customers", health);
        out.put("atRiskCount", health.stream().filter(c -> !"LOW".equals(c.get("churnRisk"))).count());
        return out;
    }

    /** Composite 0–100 customer-health score: starts at CSAT (0–5 → 0–100), penalised by overdue/open. Pure. */
    static int healthScore(double avgCsat, long overdue, long open) {
        int base = avgCsat > 0 ? (int) Math.round(avgCsat / 5.0 * 100) : 70; // no CSAT yet → neutral 70
        int penalty = (int) (overdue * 15 + Math.max(0, open - 5) * 3);
        return Math.max(0, Math.min(100, base - penalty));
    }

    // ── Cap X · Strategic theme tracker ──────────────────────────────────────────
    public Map<String, Object> strategicThemes(String callerId, String workspaceId) {
        requireConsole(callerId, workspaceId);

        List<Map<String, Object>> themes = jdbc.queryForList(
            "SELECT t.id, t.name, t.status, t.quarter, t.objective_id, "
            + "(SELECT ROUND(AVG(CASE WHEN kr.target_value <> kr.start_value "
            + "  THEN GREATEST(0, LEAST(100, (kr.current_value - kr.start_value) "
            + "       / (kr.target_value - kr.start_value) * 100)) ELSE 0 END)) "
            + " FROM key_results kr WHERE kr.objective_id = t.objective_id) AS progress "
            + "FROM roadmap_themes t WHERE t.workspace_id = ? AND t.deleted_at IS NULL "
            + "ORDER BY t.display_order, t.created_at", workspaceId);
        for (Map<String, Object> t : themes) {
            if (t.get("progress") == null) t.put("progress", 0); {
        }
            }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("themes", themes);
        return out;
    }

    // ── Cap X · Strategy-to-execution map ────────────────────────────────────────
    public Map<String, Object> strategyToExecution(String callerId, String workspaceId) {
        requireConsole(callerId, workspaceId);

        List<Map<String, Object>> objectives = jdbc.queryForList(
            "SELECT id, title, level, quarter, status FROM objectives "
            + "WHERE workspace_id = ? AND deleted_at IS NULL ORDER BY created_at", workspaceId);

        for (Map<String, Object> obj : objectives) {
            String objId = String.valueOf(obj.get("id"));
            List<Map<String, Object>> krs = jdbc.queryForList(
                "SELECT id, title, status FROM key_results WHERE objective_id = ? AND workspace_id = ? "
                + "ORDER BY display_order", objId, workspaceId);
            for (Map<String, Object> kr : krs) {
                String krId = String.valueOf(kr.get("id"));
                List<Map<String, Object>> links = jdbc.queryForList(
                    "SELECT l.entity_type, l.entity_id, wi.title AS work_item_title, wi.status AS work_item_status "
                    + "FROM okr_links l "
                    + "LEFT JOIN work_items wi ON wi.id = l.entity_id "
                    + "LEFT JOIN projects p ON p.id = wi.project_id AND p.workspace_id = l.workspace_id "
                    + "WHERE l.key_result_id = ? AND l.workspace_id = ?", krId, workspaceId);
                kr.put("links", links);
            }
            obj.put("keyResults", krs);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("objectives", objectives);
        return out;
    }

    private static int completion(Object done, Object total) {
        long d = done == null ? 0 : ((Number) done).longValue();
        long t = total == null ? 0 : ((Number) total).longValue();
        return t == 0 ? 0 : (int) Math.round(d * 100.0 / t);
    }
}
