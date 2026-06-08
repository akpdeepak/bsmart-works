package com.bcits.works;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Public, unauthenticated, read-only access to a dashboard via its share token (iteration 6).
 * The token is an unguessable, revocable secret minted by the dashboard owner. The response
 * carries only the dashboard name + widget layout + an ORG-scoped aggregate for the dashboard's
 * workspace — never owner identity, ids, or per-user data. Permitted in SecurityConfig for
 * GET /api/v1/public/** only; identifiers in SQL are fixed literals and all values are bound.
 */
@RestController
@RequestMapping("/api/v1/public")
public class PublicDashboardController {

    private final DashboardRepository dashboardRepository;
    private final DashboardWidgetRepository widgetRepository;
    private final AggregationService aggregationService;
    private final JdbcTemplate jdbc;

    public PublicDashboardController(DashboardRepository dashboardRepository,
                                     DashboardWidgetRepository widgetRepository,
                                     AggregationService aggregationService, JdbcTemplate jdbc) {
        this.dashboardRepository = dashboardRepository;
        this.widgetRepository = widgetRepository;
        this.aggregationService = aggregationService;
        this.jdbc = jdbc;
    }

    @GetMapping("/dashboards/{token}")
    public ResponseEntity<Map<String, Object>> getByToken(@PathVariable String token) {
        if (token == null || token.isBlank()) return ResponseEntity.notFound().build();
        return dashboardRepository.findByShareToken(token)
            .map(d -> {
                Map<String, Object> out = new LinkedHashMap<>();
                out.put("name", d.getName());
                out.put("layoutCols", d.getLayoutCols());
                out.put("widgets", widgetRepository.findByDashboardIdOrderByPositionAsc(d.getId()));
                AggregationService.ScopeFilter f =
                    aggregationService.resolve("ORG", null, null, List.of(), d.getWorkspaceId());
                out.put("aggregate", buildAggregate(f));
                return ResponseEntity.ok(out);
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private Map<String, Object> buildAggregate(AggregationService.ScopeFilter filter) {
        String where = filter.sql() + " AND deleted_at IS NULL";
        Object[] params = filter.params();
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM work_items WHERE " + where, Long.class, params);
        Map<String, Object> agg = new LinkedHashMap<>();
        agg.put("scope", "ORG");
        agg.put("total", total == null ? 0L : total);
        agg.put("byStatus", seriesBy("status", where, params));
        agg.put("byType", seriesBy("type", where, params));
        agg.put("byPriority", seriesBy("priority", where, params));
        agg.put("recent", recent(where, params));
        return agg;
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
        String sql = "SELECT title, status, priority FROM work_items WHERE " + where
            + " ORDER BY created_at DESC LIMIT 10";
        return jdbc.query(sql, (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("title", rs.getString("title"));
            m.put("status", rs.getString("status"));
            m.put("priority", rs.getString("priority"));
            return m;
        }, params);
    }
}
