package com.example.demo;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/**
 * AI audit log (iteration 10, Cap Z / I10-S08). Read-only, workspace-scoped (RB-40 §1) view of the
 * append-style {@code ai_invocations} table — every AI call with its user, capability, model tier,
 * token counts, cost, the policy state at call time, whether the deterministic fallback was used and
 * the outcome. Regulator-ready CSV export mirrors {@link ComplianceDashboardController}. Reads require
 * workspace membership ({@code view_items}).
 */
@RestController
@RequestMapping("/api/v1/ai/audit")
public class AiAuditController {

    private static final String COLS =
        "id, created_at, user_id, capability, model_tier, prompt_chars, tokens_in, tokens_out, "
        + "cost, policy_state, fallback_used, outcome";

    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public AiAuditController(JdbcTemplate jdbc, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<Map<String, Object>> audit(@RequestParam String workspaceId,
                                           @RequestParam(defaultValue = "200") int limit) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return jdbc.queryForList(
            "SELECT " + COLS + " FROM ai_invocations WHERE workspace_id = ? "
            + "ORDER BY created_at DESC LIMIT ?", workspaceId, Math.min(limit, 1000));
    }

    @GetMapping("/export")
    public ResponseEntity<String> export(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT " + COLS + " FROM ai_invocations WHERE workspace_id = ? "
            + "ORDER BY created_at DESC LIMIT 10000", workspaceId);
        StringBuilder csv = new StringBuilder(
            "created_at,user_id,capability,model_tier,tokens_in,tokens_out,cost,policy_state,fallback_used,outcome\n");
        for (Map<String, Object> r : rows) {
            csv.append(cell(r.get("created_at"))).append(',')
               .append(cell(r.get("user_id"))).append(',')
               .append(cell(r.get("capability"))).append(',')
               .append(cell(r.get("model_tier"))).append(',')
               .append(cell(r.get("tokens_in"))).append(',')
               .append(cell(r.get("tokens_out"))).append(',')
               .append(cell(r.get("cost"))).append(',')
               .append(cell(r.get("policy_state"))).append(',')
               .append(cell(r.get("fallback_used"))).append(',')
               .append(cell(r.get("outcome"))).append('\n');
        }
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"ai-audit.csv\"")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(csv.toString());
    }

    private String cell(Object value) {
        if (value == null) {
            return "";
        }
        String s = value.toString().replace("\"", "\"\"");
        return '"' + s + '"';
    }
}
