package com.example.demo;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Compliance dashboard + audit log (iteration 7, Cap K). Read-only, workspace-scoped (RB-40 §1)
 * aggregations over {@code compliance_violations}: severity breakdown, status totals, 30-day trend,
 * a rules × projects heatmap, and the top offending rules — the data behind the most data-dense
 * screen in the product. The audit log reads the append-only {@code events} backbone (RB-10 §3)
 * filtered to this workspace's rules and violations, and exports regulator-ready CSV. All reads
 * require workspace membership.
 */
@RestController
@RequestMapping("/api/v1/compliance")
public class ComplianceDashboardController {

    private static final List<String> ACTIVE = List.of("OPEN", "ACKNOWLEDGED");

    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ComplianceDashboardController(JdbcTemplate jdbc, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        Map<String, Object> out = new LinkedHashMap<>();

        out.put("severityBreakdown", jdbc.queryForList(
            "SELECT severity, COUNT(*) AS count FROM compliance_violations "
            + "WHERE workspace_id = ? AND status IN ('OPEN','ACKNOWLEDGED') GROUP BY severity",
            workspaceId));

        out.put("statusBreakdown", jdbc.queryForList(
            "SELECT status, COUNT(*) AS count FROM compliance_violations "
            + "WHERE workspace_id = ? GROUP BY status", workspaceId));

        out.put("trend", jdbc.queryForList(
            "SELECT to_char(detected_at::date, 'YYYY-MM-DD') AS day, COUNT(*) AS count "
            + "FROM compliance_violations WHERE workspace_id = ? "
            + "AND detected_at >= NOW() - INTERVAL '30 days' "
            + "GROUP BY day ORDER BY day", workspaceId));

        out.put("heatmap", jdbc.queryForList(
            "SELECT v.rule_id, r.name AS rule_name, v.project_id, COUNT(*) AS count "
            + "FROM compliance_violations v JOIN compliance_rules r ON r.id = v.rule_id "
            + "WHERE v.workspace_id = ? AND v.status IN ('OPEN','ACKNOWLEDGED') "
            + "GROUP BY v.rule_id, r.name, v.project_id ORDER BY count DESC", workspaceId));

        out.put("topRules", jdbc.queryForList(
            "SELECT v.rule_id, r.name AS rule_name, COUNT(*) AS count "
            + "FROM compliance_violations v JOIN compliance_rules r ON r.id = v.rule_id "
            + "WHERE v.workspace_id = ? AND v.status IN ('OPEN','ACKNOWLEDGED') "
            + "GROUP BY v.rule_id, r.name ORDER BY count DESC LIMIT 10", workspaceId));

        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("activeRules", count(
            "SELECT COUNT(*) FROM compliance_rules WHERE workspace_id = ? AND active = TRUE", workspaceId));
        totals.put("openViolations", count(
            "SELECT COUNT(*) FROM compliance_violations WHERE workspace_id = ? AND status = 'OPEN'", workspaceId));
        totals.put("acknowledgedViolations", count(
            "SELECT COUNT(*) FROM compliance_violations WHERE workspace_id = ? AND status = 'ACKNOWLEDGED'", workspaceId));
        totals.put("resolvedViolations", count(
            "SELECT COUNT(*) FROM compliance_violations WHERE workspace_id = ? AND status IN ('RESOLVED','WONT_FIX')", workspaceId));
        out.put("totals", totals);
        return out;
    }

    @GetMapping("/audit")
    public List<Map<String, Object>> audit(@RequestParam String workspaceId,
                                           @RequestParam(defaultValue = "200") int limit) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return jdbc.queryForList(auditSql() + " LIMIT ?", workspaceId, workspaceId, Math.min(limit, 1000));
    }

    @GetMapping("/audit/export")
    public ResponseEntity<String> exportAudit(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        List<Map<String, Object>> rows = jdbc.queryForList(auditSql() + " LIMIT 10000", workspaceId, workspaceId);
        StringBuilder csv = new StringBuilder("occurred_at,event_type,aggregate_id,actor_id,payload\n");
        for (Map<String, Object> r : rows) {
            csv.append(csvCell(r.get("occurred_at"))).append(',')
               .append(csvCell(r.get("event_type"))).append(',')
               .append(csvCell(r.get("aggregate_id"))).append(',')
               .append(csvCell(r.get("actor_id"))).append(',')
               .append(csvCell(r.get("payload"))).append('\n');
        }
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"compliance-audit.csv\"")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(csv.toString());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Append-only compliance events for this workspace's rules and violations. */
    private String auditSql() {
        return "SELECT occurred_at, event_type, aggregate_id, actor_id, payload FROM events "
            + "WHERE event_type LIKE 'COMPLIANCE\\_%' AND aggregate_id IN ("
            + "  SELECT id FROM compliance_rules WHERE workspace_id = ? "
            + "  UNION SELECT id FROM compliance_violations WHERE workspace_id = ?) "
            + "ORDER BY occurred_at DESC";
    }

    private long count(String sql, String workspaceId) {
        Long n = jdbc.queryForObject(sql, Long.class, workspaceId);
        return n == null ? 0 : n;
    }

    private String csvCell(Object value) {
        if (value == null) return "";
        String s = value.toString().replace("\"", "\"\"");
        return '"' + s + '"';
    }
}
