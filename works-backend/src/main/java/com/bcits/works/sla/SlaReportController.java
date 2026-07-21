package com.bcits.works.sla;

import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * SLA reporting + audit log (iteration 8, Cap M). Read-only, workspace-scoped (RB-40 §1). The report
 * rolls up met / breached / at-risk counts overall and per policy (the "met vs breached rates by
 * policy" the spec asks for). The audit log reads the append-only {@code events} backbone (RB-10 §3)
 * — every start, pause, resume, breach, and escalation — and exports a regulator-ready CSV.
 */
@RestController
@RequestMapping("/api/v1/sla")
public class SlaReportController {

    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public SlaReportController(JdbcTemplate jdbc, AuthenticatedUser authenticatedUser, RbacGate rbac) {
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping("/report")
    public Map<String, Object> report(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");

        Map<String, Long> byState = new LinkedHashMap<>();
        for (Map<String, Object> row : jdbc.queryForList(
                "SELECT state, COUNT(*) AS n FROM sla_instances WHERE workspace_id = ? GROUP BY state",
                workspaceId)) {
            byState.put((String) row.get("state"), ((Number) row.get("n")).longValue());
        }
        long met = byState.getOrDefault("MET", 0L);
        long breached = byState.getOrDefault("BREACHED", 0L);
        long running = byState.getOrDefault("RUNNING", 0L);
        long paused = byState.getOrDefault("PAUSED", 0L);
        long settled = met + breached;

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("met", met);
        summary.put("breached", breached);
        summary.put("running", running);
        summary.put("paused", paused);
        summary.put("total", met + breached + running + paused);
        summary.put("breachRatePercent", settled == 0 ? 0 : Math.round((breached * 100.0) / settled));
        summary.put("metRatePercent", settled == 0 ? 0 : Math.round((met * 100.0) / settled));

        List<Map<String, Object>> byPolicy = jdbc.queryForList(
            "SELECT p.id, p.name, "
            + "  COUNT(*) FILTER (WHERE i.state = 'MET') AS met, "
            + "  COUNT(*) FILTER (WHERE i.state = 'BREACHED') AS breached, "
            + "  COUNT(*) FILTER (WHERE i.state IN ('RUNNING','PAUSED')) AS active "
            + "FROM sla_policies p LEFT JOIN sla_instances i ON i.policy_id = p.id "
            + "WHERE p.workspace_id = ? GROUP BY p.id, p.name ORDER BY p.name",
            workspaceId);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("summary", summary);
        out.put("byPolicy", byPolicy);
        return out;
    }

    @GetMapping("/audit")
    public List<Map<String, Object>> audit(@RequestParam String workspaceId,
                                           @RequestParam(defaultValue = "200") int limit) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return jdbc.queryForList(auditSql() + " LIMIT ?",
            workspaceId, workspaceId, workspaceId, Math.min(limit, 1000));
    }

    @GetMapping("/audit/export")
    public ResponseEntity<String> exportAudit(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        List<Map<String, Object>> rows = jdbc.queryForList(auditSql() + " LIMIT 10000",
            workspaceId, workspaceId, workspaceId);
        StringBuilder csv = new StringBuilder("occurred_at,event_type,aggregate_id,actor_id,payload\n");
        for (Map<String, Object> r : rows) {
            csv.append(csvCell(r.get("occurred_at"))).append(',')
               .append(csvCell(r.get("event_type"))).append(',')
               .append(csvCell(r.get("aggregate_id"))).append(',')
               .append(csvCell(r.get("actor_id"))).append(',')
               .append(csvCell(r.get("payload"))).append('\n');
        }
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("text/csv"))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"sla-audit.csv\"")
            .body(csv.toString());
    }

    /** Append-only SLA events for this workspace's clocks, policies, and calendars. */
    private String auditSql() {
        return "SELECT occurred_at, event_type, aggregate_id, actor_id, payload FROM events "
            + "WHERE event_type LIKE 'SLA\\_%' AND aggregate_id IN ("
            + "  SELECT id FROM sla_instances WHERE workspace_id = ? "
            + "  UNION SELECT id FROM sla_policies WHERE workspace_id = ? "
            + "  UNION SELECT id FROM sla_calendars WHERE workspace_id = ?) "
            + "ORDER BY occurred_at DESC";
    }

    private String csvCell(Object value) {
        if (value == null) {
            return "";
        }
        String s = value.toString().replace("\"", "\"\"");
        return '"' + s + '"';
    }
}
