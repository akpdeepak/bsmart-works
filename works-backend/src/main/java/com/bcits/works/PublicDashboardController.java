package com.bcits.works;

import com.bcits.works.shared.TenantScope;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Public, unauthenticated, read-only access to a dashboard via its share token (iteration 6).
 * The token is an unguessable, revocable secret minted by the dashboard owner. The response
 * carries only the dashboard name + widget layout + an ORG-scoped aggregate for the dashboard's
 * workspace — never owner identity, ids, or per-user data. Permitted in SecurityConfig for
 * GET /api/v1/public/** only; identifiers in SQL are fixed literals and all values are bound.
 *
 * <p>PIVOT widgets carry no pre-aggregated series in the legacy {@code aggregate}, so they are
 * resolved here server-side through {@link PivotService} (workspace from the token, never a caller —
 * RB-40 §1) and shipped as {@code pivots[widgetId] = { dimensions, measures, rows }} (or an error),
 * so the chrome-less embed can render them without an authenticated workspace context.
 */
@RestController
@RequestMapping("/api/v1/public")
public class PublicDashboardController {

    private final DashboardRepository dashboardRepository;
    private final DashboardWidgetRepository widgetRepository;
    private final JdbcTemplate jdbc;
    private final PivotService pivotService;
    private final ObjectMapper objectMapper;

    public PublicDashboardController(DashboardRepository dashboardRepository,
                                     DashboardWidgetRepository widgetRepository,
                                     JdbcTemplate jdbc,
                                     PivotService pivotService,
                                     ObjectMapper objectMapper) {
        this.dashboardRepository = dashboardRepository;
        this.widgetRepository = widgetRepository;
        this.jdbc = jdbc;
        this.pivotService = pivotService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/dashboards/{token}")
    public ResponseEntity<Map<String, Object>> getByToken(@PathVariable String token) {
        if (token == null || token.isBlank()) return ResponseEntity.notFound().build();
        // System / unfiltered escape hatch (RB-40 §1): this endpoint is unauthenticated and resolves
        // the workspace from the share token itself, not the caller — so the central tenant filter
        // (which keys off the authenticated caller's workspace) must be off. The explicit
        // workspace_id predicate below remains the entire scope.
        return TenantScope.callAsSystem(() -> getByTokenInternal(token));
    }

    private ResponseEntity<Map<String, Object>> getByTokenInternal(String token) {
        return dashboardRepository.findByShareToken(token)
            .map(d -> {
                List<DashboardWidget> widgets = widgetRepository.findByDashboardIdOrderByPositionAsc(d.getId());
                Map<String, Object> out = new LinkedHashMap<>();
                out.put("name", d.getName());
                out.put("layoutCols", d.getLayoutCols());
                out.put("widgets", widgets);
                // ORG aggregate, scoped to THIS dashboard's workspace (taken from the token, never
                // the caller — RB-40 §1). The workspace predicate is the whole scope.
                out.put("aggregate", buildAggregate(d.getWorkspaceId()));
                // PIVOT widgets are resolved server-side (same workspace from the token) so the
                // embed can render them without a workspaceId; keyed by widget id.
                out.put("pivots", resolvePivots(widgets, d.getWorkspaceId()));
                return ResponseEntity.ok(out);
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Resolve every PIVOT widget's saved spec against the dashboard's workspace, returning a map
     * of widgetId → { dimensions, measures, rows } (or { error }). A single widget's failure (a
     * stale/invalid spec) never aborts the rest; non-PIVOT widgets are skipped. The token already
     * resolved the workspace, so {@link PivotService#resolveForWorkspace} is the entire scope.
     */
    private Map<String, Object> resolvePivots(List<DashboardWidget> widgets, String workspaceId) {
        Map<String, Object> pivots = new LinkedHashMap<>();
        for (DashboardWidget w : widgets) {
            if (!"PIVOT".equalsIgnoreCase(w.getWidgetType())) {
                continue;
            }
            String key = String.valueOf(w.getId());
            try {
                PivotSpec spec = pivotSpecFromConfig(w.getConfig());
                if (spec == null) {
                    continue; // unconfigured PIVOT — the card shows its own "configure this" hint
                }
                PivotService.PivotResult r = pivotService.resolveForWorkspace(workspaceId, spec);
                Map<String, Object> data = new LinkedHashMap<>();
                data.put("dimensions", r.dimensions());
                data.put("measures", r.measures());
                data.put("rows", r.rows());
                pivots.put(key, data);
            } catch (RuntimeException ex) {
                pivots.put(key, Map.of("error", ex.getMessage() == null ? "Could not load this widget." : ex.getMessage()));
            }
        }
        return pivots;
    }

    /**
     * Build a {@link PivotSpec} from a stored PIVOT widget config {@code { "spec": { sourceKind,
     * query, metricKey, mode, measures:[{field,agg}], dimensions:[…], filters } } }. Mirrors the
     * frontend {@code buildPivotSpec} so the two surfaces describe the same pivot. Returns null when
     * there is no spec yet (an unconfigured widget). Field/agg values are not trusted here — the
     * pivot engine validates every alias/agg through the allow-list before any SQL (RB-10 §6).
     */
    private PivotSpec pivotSpecFromConfig(String config) {
        if (config == null || config.isBlank()) {
            return null;
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(config);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            return null;
        }
        JsonNode spec = root.get("spec");
        if (spec == null || spec.isNull() || !spec.isObject()) {
            return null;
        }
        String sourceKind = text(spec, "sourceKind", "guided");
        String query = text(spec, "query", null);
        String metricKey = text(spec, "metricKey", null);
        String mode = text(spec, "mode", "group");

        WidgetSource source = switch (sourceKind.toLowerCase(Locale.ROOT)) {
            case "metric" -> new WidgetSource("metric", metricKey, null, null, null, null, null);
            case "bql" -> new WidgetSource("bql", null, query == null ? "" : query, null, mode, null, null);
            default -> new WidgetSource("guided", null, null,
                new WidgetSource.GuidedSpec(null, null, null, null, null), mode, null, null);
        };

        List<PivotSpec.Measure> measures = new ArrayList<>();
        JsonNode ms = spec.get("measures");
        if (ms != null && ms.isArray()) {
            for (JsonNode m : ms) {
                String field = text(m, "field", "*");
                String agg = text(m, "agg", "COUNT");
                measures.add(new PivotSpec.Measure(field, PivotSpec.Agg.valueOf(agg.toUpperCase(Locale.ROOT))));
            }
        }
        if (measures.isEmpty()) {
            measures.add(new PivotSpec.Measure("*", PivotSpec.Agg.COUNT));
        }

        List<String> dimensions = new ArrayList<>();
        JsonNode dims = spec.get("dimensions");
        if (dims != null && dims.isArray()) {
            for (JsonNode dnode : dims) {
                if (dnode.isTextual()) {
                    dimensions.add(dnode.asText());
                }
            }
        }
        String filters = text(spec, "filters", null);
        return new PivotSpec(source, measures, dimensions, filters);
    }

    private static String text(JsonNode node, String field, String fallback) {
        JsonNode v = node == null ? null : node.get(field);
        return v != null && v.isTextual() && !v.asText().isBlank() ? v.asText() : fallback;
    }

    private Map<String, Object> buildAggregate(String workspaceId) {
        String where = "deleted_at IS NULL "
            + "AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)";
        Object[] params = new Object[]{ workspaceId };
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
