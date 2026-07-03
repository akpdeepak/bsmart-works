package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Insights (iteration 6) — server-side work-item aggregation for dashboards/reports.
 * Resolves a scope (PERSONAL/PROJECT/TEAM/ORG) and returns distribution counts so a
 * TEAM/ORG dashboard aggregates across many projects, not just the loaded set.
 *
 * <p><b>Tenant safety (RB-40 §1, RB-10 §2):</b> the caller never dictates which workspace's rows
 * come back. The workspace is <i>derived from the data</i> — from the project (PROJECT) or the team
 * (TEAM), or taken from the request only for ORG/PERSONAL — and then the caller's membership +
 * {@code view_items} permission is proven via {@link RbacService} before any query runs. Every query
 * is finally bounded by a mandatory {@link #WORKSPACE_SCOPE} predicate, so a foreign project/team id
 * can never leak rows. Identifiers (status/type/priority) are fixed literals; all user values are bound.
 */
@RestController
@RequestMapping("/api/v1/insights")
public class AggregationController {

    // Mandatory tenant boundary, identical in shape to WidgetDataService: a row is visible only if
    // its project lives in the resolved workspace. The workspaceId bind is always the FIRST param.
    private static final String WORKSPACE_SCOPE =
        "deleted_at IS NULL AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)";

    private final JdbcTemplate jdbc;
    private final TeamRepository teamRepository;
    private final AggregationService aggregationService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public AggregationController(JdbcTemplate jdbc, TeamRepository teamRepository,
                                 AggregationService aggregationService, AuthenticatedUser authenticatedUser,
                                 RbacService rbac) {
        this.jdbc = jdbc;
        this.teamRepository = teamRepository;
        this.aggregationService = aggregationService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping("/work-items")
    public Map<String, Object> aggregate(@RequestParam(defaultValue = "ORG") String scope,
                                         @RequestParam(required = false) String projectId,
                                         @RequestParam(required = false) String teamId,
                                         @RequestParam(required = false) String workspaceId) {
        String userId = authenticatedUser.id();
        String s = scope == null ? "ORG" : scope.toUpperCase(Locale.ROOT);

        // 1. Resolve the workspace from the data (never trust the caller's claim), gathering the
        //    team's projects along the way for TEAM scope.
        List<String> teamProjectIds = List.of();
        String effectiveWorkspaceId;
        switch (s) {
            case "PROJECT" -> {
                effectiveWorkspaceId = rbac.workspaceForProject(projectId);
                if (effectiveWorkspaceId == null) {
                    throw ApiException.notFound("Project", String.valueOf(projectId));
                }
            }
            case "TEAM" -> {
                Team team = teamRepository.findById(teamId == null ? "" : teamId)
                    .orElseThrow(() -> ApiException.notFound("Team", String.valueOf(teamId)));
                effectiveWorkspaceId = team.getWorkspaceId();
                teamProjectIds = aggregationService.parseProjectIds(team.getProjectIds());
            }
            default -> { // ORG, PERSONAL, or unknown → require an explicit workspace
                if (workspaceId == null || workspaceId.isBlank()) {
                    throw ApiException.badRequest("WORKSPACE_REQUIRED",
                        "A workspaceId is required for this scope.", "workspaceId");
                }
                effectiveWorkspaceId = workspaceId;
            }
        }

        // 2. Prove membership + permission in the resolved workspace (RB-40 §1, RB-10 §2). A
        //    non-member has tier 0 and is denied with 403 before any query executes.
        rbac.require(userId, effectiveWorkspaceId, "view_items");

        // 3. Compose the mandatory workspace predicate (FIRST) with the within-workspace narrowing.
        AggregationService.ScopeFilter f = aggregationService.resolve(s, userId, projectId, teamProjectIds);
        String where = WORKSPACE_SCOPE + " AND (" + f.sql() + ")";
        Object[] params = prepend(effectiveWorkspaceId, f.params());

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM work_items WHERE " + where, Long.class, params);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("scope", s);
        out.put("total", total == null ? 0L : total);
        out.put("byStatus", seriesBy("status", where, params));
        out.put("byType", seriesBy("type", where, params));
        out.put("byPriority", seriesBy("priority", where, params));
        out.put("recent", recent(where, params));
        return out;
    }

    /** Bind the workspaceId as the first parameter, ahead of the scope's own binds. */
    private static Object[] prepend(String workspaceId, Object[] rest) {
        List<Object> all = new ArrayList<>();
        all.add(workspaceId);
        if (rest != null) {
            for (Object p : rest) {
                all.add(p);
            }
        }
        return all.toArray();
    }

    private List<Map<String, Object>> seriesBy(String column, String where, Object[] params) {
        String sql = "SELECT COALESCE(" + column + ", 'None') AS label, COUNT(*) AS value "
            + "FROM work_items WHERE " + where + " GROUP BY " + column + " ORDER BY value DESC";
        return jdbc.query(sql, (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("label", rs.getString("label"));
            m.put("value", rs.getInt("value"));
            return m;
        }, params);
    }

    private List<Map<String, Object>> recent(String where, Object[] params) {
        String sql = "SELECT id, title, status, priority, type FROM work_items WHERE " + where
            + " ORDER BY created_at DESC LIMIT 10";
        return jdbc.query(sql, (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getString("id"));
            m.put("title", rs.getString("title"));
            m.put("status", rs.getString("status"));
            m.put("priority", rs.getString("priority"));
            m.put("type", rs.getString("type"));
            return m;
        }, params);
    }
}
