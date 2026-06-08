package com.bcits.works;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Insights (iteration 6) — server-side work-item aggregation for dashboards/reports.
 * Resolves a scope (PERSONAL/PROJECT/TEAM/ORG) and returns distribution counts so a
 * TEAM/ORG dashboard aggregates across many projects, not just the loaded set.
 * Identifiers (status/type/priority) are fixed literals; all user values are bound.
 */
@RestController
@RequestMapping("/api/v1/insights")
public class AggregationController {

    private final JdbcTemplate jdbc;
    private final TeamRepository teamRepository;
    private final AggregationService aggregationService;
    private final AuthenticatedUser authenticatedUser;

    public AggregationController(JdbcTemplate jdbc, TeamRepository teamRepository,
                                 AggregationService aggregationService, AuthenticatedUser authenticatedUser) {
        this.jdbc = jdbc;
        this.teamRepository = teamRepository;
        this.aggregationService = aggregationService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping("/work-items")
    public Map<String, Object> aggregate(@RequestParam(defaultValue = "ORG") String scope,
                                         @RequestParam(required = false) String projectId,
                                         @RequestParam(required = false) String teamId,
                                         @RequestParam(required = false) String workspaceId) {
        String userId = authenticatedUser.id();

        List<String> teamProjectIds = List.of();
        if ("TEAM".equalsIgnoreCase(scope) && teamId != null) {
            teamProjectIds = teamRepository.findById(teamId)
                .map(t -> aggregationService.parseProjectIds(t.getProjectIds()))
                .orElse(List.of());
        }

        AggregationService.ScopeFilter f = aggregationService.resolve(scope, userId, projectId, teamProjectIds, workspaceId);
        String where = f.sql() + " AND deleted_at IS NULL";
        Object[] params = f.params();

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM work_items WHERE " + where, Long.class, params);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("scope", scope.toUpperCase());
        out.put("total", total == null ? 0L : total);
        out.put("byStatus", seriesBy("status", where, params));
        out.put("byType", seriesBy("type", where, params));
        out.put("byPriority", seriesBy("priority", where, params));
        out.put("recent", recent(where, params));
        return out;
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
