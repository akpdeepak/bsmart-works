package com.bcits.works;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * HEART metrics + activation-funnel endpoints (WI-06–10).
 *
 * All queries are workspace-scoped (RB-40 §1).  No personally identifiable
 * counters are surfaced — only aggregate counts per workspace.
 *
 * HEART framework:
 *   H — Happiness       : proxy = on-time completion rate
 *   E — Engagement      : distinct active users / total members (7 days)
 *   A — Adoption        : distinct creators / total members
 *   R — Retention       : week-over-week active user overlap
 *   T — Task Success    : items Done / items created (30 days)
 */
@RestController
@RequestMapping("/api/v1/metrics")
@CrossOrigin(origins = "*")
public class HeartMetricsController {

    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public HeartMetricsController(JdbcTemplate jdbc,
                                   AuthenticatedUser authenticatedUser,
                                   RbacService rbac) {
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    // ── GET /api/v1/metrics/heart?workspaceId= ─────────────────────────────────

    @GetMapping("/heart")
    public ResponseEntity<Map<String, Object>> heart(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_analytics");

        Map<String, Object> result = new LinkedHashMap<>();

        // ── Engagement: distinct active users (7 d) / total members ──────────
        Map<String, Object> engRow = jdbc.queryForMap(
            "SELECT " +
            "  COUNT(DISTINCT e.actor_id) FILTER (WHERE e.occurred_at >= NOW() - INTERVAL '7 days') AS active_7d," +
            "  COUNT(DISTINCT wm.user_id) AS total_members " +
            "FROM workspace_members wm " +
            "LEFT JOIN events e ON e.actor_id = wm.user_id AND e.workspace_id = ? " +
            "WHERE wm.workspace_id = ?",
            workspaceId, workspaceId);

        long active7d      = toLong(engRow.get("active_7d"));
        long totalMembers  = toLong(engRow.get("total_members"));
        long engagementPct = totalMembers > 0 ? Math.round(100.0 * active7d / totalMembers) : 0;
        result.put("engagement", Map.of("score", engagementPct, "active7d", active7d, "totalMembers", totalMembers));

        // ── Adoption: distinct item creators / total members ──────────────────
        Map<String, Object> adpRow = jdbc.queryForMap(
            "SELECT " +
            "  COUNT(DISTINCT e.actor_id) FILTER (WHERE e.event_type = 'WORK_ITEM_CREATED') AS creators," +
            "  COUNT(DISTINCT wm.user_id) AS total_members " +
            "FROM workspace_members wm " +
            "LEFT JOIN events e ON e.actor_id = wm.user_id AND e.workspace_id = ? " +
            "WHERE wm.workspace_id = ?",
            workspaceId, workspaceId);

        long creators    = toLong(adpRow.get("creators"));
        long adpMembers  = toLong(adpRow.get("total_members"));
        long adoptionPct = adpMembers > 0 ? Math.round(100.0 * creators / adpMembers) : 0;
        result.put("adoption", Map.of("score", adoptionPct, "creators", creators, "totalMembers", adpMembers));

        // ── Retention: this-week active / last-week active ────────────────────
        Map<String, Object> retRow = jdbc.queryForMap(
            "SELECT " +
            "  COUNT(DISTINCT actor_id) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days') AS this_week," +
            "  COUNT(DISTINCT actor_id) FILTER (WHERE occurred_at >= NOW() - INTERVAL '14 days' AND occurred_at < NOW() - INTERVAL '7 days') AS last_week " +
            "FROM events WHERE workspace_id = ?",
            workspaceId);

        long thisWeek   = toLong(retRow.get("this_week"));
        long lastWeek   = toLong(retRow.get("last_week"));
        long retentionPct = lastWeek > 0 ? Math.round(100.0 * thisWeek / lastWeek) : (thisWeek > 0 ? 100L : 0L);
        result.put("retention", Map.of("score", retentionPct, "thisWeek", thisWeek, "lastWeek", lastWeek));

        // ── Task Success Rate: Done / created-last-30d ────────────────────────
        Map<String, Object> tsRow = jdbc.queryForMap(
            "SELECT " +
            "  COUNT(*) FILTER (WHERE wi.status = 'Done') AS done," +
            "  COUNT(*) AS total " +
            "FROM work_items wi " +
            "JOIN projects p ON p.id = wi.project_id " +
            "WHERE p.workspace_id = ? AND wi.deleted_at IS NULL " +
            "  AND wi.created_at >= NOW() - INTERVAL '30 days'",
            workspaceId);

        long done         = toLong(tsRow.get("done"));
        long tsTotal      = toLong(tsRow.get("total"));
        long taskSuccPct  = tsTotal > 0 ? Math.round(100.0 * done / tsTotal) : 0;
        result.put("taskSuccess", Map.of("score", taskSuccPct, "done", done, "total", tsTotal));

        // ── Happiness proxy: on-time completions / completed-with-due-date ────
        Map<String, Object> hapRow = jdbc.queryForMap(
            "SELECT " +
            "  COUNT(*) FILTER (WHERE wi.status = 'Done' AND (wi.due_date IS NULL OR wi.status_changed_at::date <= wi.due_date)) AS on_time," +
            "  COUNT(*) FILTER (WHERE wi.status = 'Done') AS completed " +
            "FROM work_items wi " +
            "JOIN projects p ON p.id = wi.project_id " +
            "WHERE p.workspace_id = ? AND wi.deleted_at IS NULL",
            workspaceId);

        long onTime       = toLong(hapRow.get("on_time"));
        long completed    = toLong(hapRow.get("completed"));
        long happinessPct = completed > 0 ? Math.round(100.0 * onTime / completed) : 0;
        result.put("happiness", Map.of("score", happinessPct, "onTime", onTime, "completed", completed));

        return ResponseEntity.ok(result);
    }

    // ── GET /api/v1/metrics/funnel?workspaceId= ────────────────────────────────

    @GetMapping("/funnel")
    public ResponseEntity<List<Map<String, Object>>> funnel(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_analytics");

        // Total members is the funnel top; each subsequent step is a subset.
        Map<String, Object> counts = jdbc.queryForMap(
            "SELECT " +
            "  COUNT(DISTINCT wm.user_id)                                                    AS step1_members," +
            "  COUNT(DISTINCT el.actor_id)                                                   AS step2_logged_in," +
            "  COUNT(DISTINCT ec.actor_id)                                                   AS step3_created_item," +
            "  COUNT(DISTINCT eco.actor_id)                                                  AS step4_collaborated," +
            "  COUNT(DISTINCT er.actor_id)                                                   AS step5_retained " +
            "FROM workspace_members wm " +
            "LEFT JOIN (SELECT DISTINCT actor_id FROM events WHERE event_type = 'USER_LOGGED_IN'      AND workspace_id = ?) el  ON el.actor_id  = wm.user_id " +
            "LEFT JOIN (SELECT DISTINCT actor_id FROM events WHERE event_type = 'WORK_ITEM_CREATED'   AND workspace_id = ?) ec  ON ec.actor_id  = wm.user_id " +
            "LEFT JOIN (SELECT DISTINCT actor_id FROM events WHERE event_type IN ('COMMENT_ADDED','WORK_ITEM_ASSIGNED') AND workspace_id = ?) eco ON eco.actor_id = wm.user_id " +
            "LEFT JOIN (SELECT DISTINCT actor_id FROM events WHERE occurred_at >= NOW() - INTERVAL '7 days' AND workspace_id = ?) er  ON er.actor_id  = wm.user_id " +
            "WHERE wm.workspace_id = ?",
            workspaceId, workspaceId, workspaceId, workspaceId, workspaceId);

        long s1 = toLong(counts.get("step1_members"));
        long s2 = toLong(counts.get("step2_logged_in"));
        long s3 = toLong(counts.get("step3_created_item"));
        long s4 = toLong(counts.get("step4_collaborated"));
        long s5 = toLong(counts.get("step5_retained"));

        List<Map<String, Object>> stages = List.of(
            stage("Invited",       "Members added to workspace",           s1, s1),
            stage("Signed in",     "Completed first login",                s2, s1),
            stage("Created item",  "Created at least one work item",       s3, s1),
            stage("Collaborated",  "Commented or assigned work to others", s4, s1),
            stage("Retained",      "Active in the last 7 days",            s5, s1)
        );
        return ResponseEntity.ok(stages);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private static Map<String, Object> stage(String label, String description, long count, long top) {
        long pct = top > 0 ? Math.round(100.0 * count / top) : 0;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("description", description);
        m.put("count", count);
        m.put("pct", pct);
        return m;
    }

    private static long toLong(Object v) {
        if (v == null) return 0L;
        if (v instanceof Long l) return l;
        if (v instanceof Number n) return n.longValue();
        return 0L;
    }
}
