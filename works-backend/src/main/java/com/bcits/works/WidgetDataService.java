package com.bcits.works;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Resolves a {@link WidgetSource} (metric | guided | bql) into a renderable result for a Today /
 * dashboard widget. This is the single execution path for all three source kinds: guided specs and
 * the metric registry both funnel through the same workspace-scoped SQL as raw BQL, so tenant
 * isolation (RB-40 §1) and bind-parameter safety (RB-10 §6) are enforced once, not per source kind.
 *
 * <p>Every query is scoped to the caller's workspace via the project→workspace membership predicate;
 * the caller's {@code view_items} permission is checked by the controller's authenticated context
 * before any resolve runs (RBAC stays in the service boundary — here and {@link RbacService}).
 *
 * <p>NFR guards (RB-40 §5, dashboard P95 1.5s): a dedicated 5-second-timeout JdbcTemplate, list rows
 * clamped to {@value #MAX_LIST}, group buckets to {@value #MAX_GROUP}, and a batch cap of
 * {@value #MAX_BATCH} so one widget grid cannot fan out unbounded work.
 */
@Service
public class WidgetDataService {

    static final int MAX_LIST = 50;
    static final int MAX_GROUP = 20;
    static final int MAX_BATCH = 12;
    private static final int QUERY_TIMEOUT_SECONDS = 5;

    // Only these BQL/guided group dimensions and list columns are addressable — an allow-list, so a
    // group-by or projection can never reference an arbitrary column (RB-10 §4 filtering discipline).
    private static final Map<String, String> GROUP_DIMENSIONS = Map.of(
        "status", "status", "type", "type", "priority", "priority");
    private static final String LIST_COLUMNS =
        "id, title, status, type, priority, assignee_id, due_date, story_points";

    // work_items rows visible to a workspace: project lives in that workspace. The workspaceId bind
    // is always the FIRST parameter of every scoped query; per-source params follow.
    private static final String WORKSPACE_SCOPE =
        "deleted_at IS NULL AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)";

    private final JdbcTemplate jdbc;
    private final BqlCompiler compiler;
    private final RbacService rbac;
    private final MetricCatalog catalog = new MetricCatalog();

    public WidgetDataService(DataSource dataSource, BqlCompiler compiler, RbacService rbac) {
        // A dedicated template so the per-query timeout never mutates the shared bean.
        this.jdbc = new JdbcTemplate(dataSource);
        this.jdbc.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
        this.compiler = compiler;
        this.rbac = rbac;
    }

    /** A widget result: exactly one of value / series / rows is populated, keyed by {@code shape}. */
    public record WidgetData(String shape, Long value,
                             List<Map<String, Object>> series, List<Map<String, Object>> rows) {
        static WidgetData scalar(long v) { return new WidgetData("scalar", v, null, null); }
        static WidgetData series(List<Map<String, Object>> s) { return new WidgetData("series", null, s, null); }
        static WidgetData list(List<Map<String, Object>> r) { return new WidgetData("list", null, null, r); }
    }

    /** One batch entry: the widget id, its resolved data, or an error message (never both). */
    public record BatchResult(String id, WidgetData data, String error) { }

    // ── Public API ──────────────────────────────────────────────────────────────

    /** The curated metric catalog the "Pick a metric" picker renders (workspace-membership gated). */
    public List<Map<String, Object>> metricCatalog(String workspaceId, String userId) {
        rbac.require(userId, workspaceId, "view_items");
        return catalog.describe();
    }

    /** Resolve one source. Throws {@link ApiException} on a bad spec; {@link BqlException} on bad BQL. */
    public WidgetData resolve(String workspaceId, String userId, WidgetSource source) {
        // Membership gate doubles as the tenant boundary (RB-40 §1) — enforced here, not the
        // controller (RB-10 §2), so the executor is safe no matter who calls it.
        rbac.require(userId, workspaceId, "view_items");
        return resolveInternal(workspaceId, userId, source);
    }

    /** Resolve many sources in one pass; a failed entry carries its error, never aborting the rest. */
    public List<BatchResult> batch(String workspaceId, String userId, Map<String, WidgetSource> sources) {
        rbac.require(userId, workspaceId, "view_items"); // one gate for the whole grid
        if (sources != null && sources.size() > MAX_BATCH) {
            throw ApiException.badRequest("BATCH_TOO_LARGE",
                "A widget batch holds at most " + MAX_BATCH + " sources.", "items");
        }
        List<BatchResult> out = new ArrayList<>();
        if (sources == null) {
            return out;
        }
        for (Map.Entry<String, WidgetSource> e : sources.entrySet()) {
            try {
                out.add(new BatchResult(e.getKey(), resolveInternal(workspaceId, userId, e.getValue()), null));
            } catch (ApiException | BqlException ex) {
                out.add(new BatchResult(e.getKey(), null, ex.getMessage()));
            }
        }
        return out;
    }

    // Resolution without the membership gate — callers above authorize first.
    private WidgetData resolveInternal(String workspaceId, String userId, WidgetSource source) {
        if (source == null || source.kind() == null) {
            throw ApiException.badRequest("INVALID_SOURCE", "Widget source kind is required.", "source");
        }
        return switch (source.kind().toLowerCase(Locale.ROOT)) {
            case "metric" -> resolveMetric(workspaceId, userId, source.key());
            case "guided" -> resolveQuery(workspaceId, userId, guidedToBql(source.guided()),
                source.mode(), source.groupBy(), source.limit());
            case "bql" -> resolveQuery(workspaceId, userId, source.query(),
                source.mode(), source.groupBy(), source.limit());
            default -> throw ApiException.badRequest("INVALID_SOURCE",
                "Unknown widget source kind: " + source.kind() + ".", "source");
        };
    }

    // ── Metric registry ──────────────────────────────────────────────────────────

    private WidgetData resolveMetric(String workspaceId, String userId, String key) {
        MetricCatalog.Metric m = catalog.get(key);
        if (m == null) {
            throw ApiException.badRequest("UNKNOWN_METRIC",
                "Unknown metric: " + key + ".", "key");
        }
        Object[] params = m.usesUser() ? new Object[] {workspaceId, userId} : new Object[] {workspaceId};
        if ("scalar".equals(m.shape())) {
            Long v = jdbc.queryForObject(m.sql(), Long.class, params);
            return WidgetData.scalar(v == null ? 0 : v);
        }
        return WidgetData.series(jdbc.queryForList(m.sql(), params));
    }

    // ── BQL / guided execution ─────────────────────────────────────────────────────

    private WidgetData resolveQuery(String workspaceId, String userId, String bql,
                                    String mode, String groupBy, Integer limit) {
        BqlCompiler.Compiled c = compiler.compile(bql == null ? "" : bql, userId);
        String where = WORKSPACE_SCOPE + (c.sql().isEmpty() ? "" : " AND (" + c.sql() + ")");
        List<Object> params = new ArrayList<>();
        params.add(workspaceId);
        params.addAll(c.params());
        String m = mode == null ? "count" : mode.toLowerCase(Locale.ROOT);

        return switch (m) {
            case "count" -> WidgetData.scalar(count(where, params));
            case "group" -> WidgetData.series(group(where, params, groupBy));
            case "list" -> WidgetData.list(list(where, params, limit));
            default -> throw ApiException.badRequest("INVALID_MODE",
                "Unknown widget mode: " + mode + ". Expected count, group, or list.", "mode");
        };
    }

    private long count(String where, List<Object> params) {
        Long v = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items WHERE " + where, Long.class, params.toArray());
        return v == null ? 0 : v;
    }

    private List<Map<String, Object>> group(String where, List<Object> params, String groupBy) {
        String dim = GROUP_DIMENSIONS.get(groupBy == null ? "" : groupBy.toLowerCase(Locale.ROOT));
        if (dim == null) {
            throw ApiException.badRequest("INVALID_GROUP_BY",
                "Group dimension must be one of " + GROUP_DIMENSIONS.keySet() + ".", "groupBy");
        }
        // dim is from the allow-list above, never user text — safe to inline.
        return jdbc.queryForList(
            "SELECT COALESCE(" + dim + ", 'None') AS label, COUNT(*) AS value "
            + "FROM work_items WHERE " + where
            + " GROUP BY " + dim + " ORDER BY value DESC LIMIT " + MAX_GROUP,
            params.toArray());
    }

    private List<Map<String, Object>> list(String where, List<Object> params, Integer limit) {
        int capped = limit == null ? 10 : Math.max(1, Math.min(MAX_LIST, limit));
        return jdbc.queryForList(
            "SELECT " + LIST_COLUMNS + " FROM work_items WHERE " + where
            + " ORDER BY COALESCE(due_date, '9999-12-31') ASC, created_at DESC LIMIT " + capped,
            params.toArray());
    }

    // ── Guided → BQL (pure; unit-tested) ───────────────────────────────────────────

    /**
     * Compiles a guided spec to a BQL string, then the normal compile/scope path takes over — so
     * guided is genuinely a visual BQL builder, not a second query engine (RB-10 §6). Statuses keep
     * their mixed case ('Done'); types/priorities are uppercase post-V68.
     */
    static String guidedToBql(WidgetSource.GuidedSpec g) {
        if (g == null) {
            return "";
        }
        List<String> clauses = new ArrayList<>();
        if (Boolean.TRUE.equals(g.open())) {
            clauses.add("status != \"Done\"");
        }
        if (Boolean.TRUE.equals(g.mine())) {
            clauses.add("assignee = currentUser()");
        }
        if (Boolean.TRUE.equals(g.overdue())) {
            clauses.add("dueDate < today()");
        }
        addInClause(clauses, "type", g.types());
        addInClause(clauses, "priority", g.priorities());
        return String.join(" AND ", clauses);
    }

    private static void addInClause(List<String> clauses, String field, List<String> values) {
        if (values == null || values.isEmpty()) {
            return;
        }
        List<String> quoted = new ArrayList<>();
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                quoted.add("\"" + v.trim() + "\"");
            }
        }
        if (quoted.size() == 1) {
            clauses.add(field + " = " + quoted.get(0));
        } else if (!quoted.isEmpty()) {
            clauses.add(field + " IN (" + String.join(", ", quoted) + ")");
        }
    }

    // ── Curated metric registry ─────────────────────────────────────────────────────

    /**
     * The named-metric catalog behind the "Pick a metric" picker. Each metric is a workspace-scoped
     * aggregate over work_items; the workspaceId bind is always the first {@code ?}, the optional
     * userId the second. Distinct from the per-role {@link DashboardService} bundles — these are
     * individually addressable so a widget can request exactly one.
     */
    static final class MetricCatalog {
        record Metric(String key, String label, String shape, boolean usesUser, String sql) { }

        private final Map<String, Metric> byKey = new LinkedHashMap<>();

        MetricCatalog() {
            String scope = WORKSPACE_SCOPE;
            scalar("open_items", "Open work items", false,
                "SELECT COUNT(*) FROM work_items WHERE " + scope + " AND status != 'Done'");
            scalar("my_open_items", "My open items", true,
                "SELECT COUNT(*) FROM work_items WHERE " + scope
                + " AND status != 'Done' AND assignee_id = ?");
            scalar("overdue_items", "Overdue items", false,
                "SELECT COUNT(*) FROM work_items WHERE " + scope
                + " AND status != 'Done' AND due_date < CURRENT_DATE");
            scalar("unassigned_open", "Unassigned open", false,
                "SELECT COUNT(*) FROM work_items WHERE " + scope
                + " AND status != 'Done' AND assignee_id IS NULL");
            scalar("blocked_items", "Blocked items", false,
                "SELECT COUNT(*) FROM work_items WHERE " + scope + " AND status = 'Blocked'");
            scalar("done_total", "Completed items", false,
                "SELECT COUNT(*) FROM work_items WHERE " + scope + " AND status = 'Done'");
            series("by_status", "Items by status",
                "SELECT COALESCE(status,'None') AS label, COUNT(*) AS value FROM work_items WHERE "
                + scope + " GROUP BY status ORDER BY value DESC LIMIT " + MAX_GROUP);
            series("by_type", "Items by type",
                "SELECT COALESCE(type,'None') AS label, COUNT(*) AS value FROM work_items WHERE "
                + scope + " GROUP BY type ORDER BY value DESC LIMIT " + MAX_GROUP);
            series("by_priority", "Items by priority",
                "SELECT COALESCE(priority,'None') AS label, COUNT(*) AS value FROM work_items WHERE "
                + scope + " GROUP BY priority ORDER BY value DESC LIMIT " + MAX_GROUP);
        }

        private void scalar(String key, String label, boolean usesUser, String sql) {
            byKey.put(key, new Metric(key, label, "scalar", usesUser, sql));
        }

        private void series(String key, String label, String sql) {
            byKey.put(key, new Metric(key, label, "series", false, sql));
        }

        Metric get(String key) {
            return key == null ? null : byKey.get(key);
        }

        List<Map<String, Object>> describe() {
            List<Map<String, Object>> out = new ArrayList<>();
            for (Metric m : byKey.values()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("key", m.key());
                row.put("label", m.label());
                row.put("shape", m.shape());
                out.add(row);
            }
            return out;
        }
    }
}
