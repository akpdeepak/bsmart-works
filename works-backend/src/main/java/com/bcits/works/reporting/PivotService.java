package com.bcits.works.reporting;
import com.bcits.works.shared.TenantScope;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.BqlCompiler;
import com.bcits.works.shared.BqlContext;
import com.bcits.works.shared.BqlException;
import com.bcits.works.shared.BqlField;
import com.bcits.works.shared.BqlFieldRegistry;
import com.bcits.works.shared.RbacGate;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * The multi-dimensional pivot engine: resolves a {@link PivotSpec} into a normalized tabular result
 * any chart can consume ({@code dimensions}, {@code measures}, {@code rows}). It is the shared core
 * behind the upcoming Dashboards + Report Builder + Reports rebuild — one execution path, so tenant
 * isolation and field-level security are enforced once (RB-40 §1), never per surface.
 *
 * <p>Every pivot is workspace-scoped through the same {@code project→workspace} predicate the widget
 * executor uses, and the caller's {@code view_items} permission is required in this service layer
 * (RB-10 §2 — RBAC stays out of the controller). Dimension and measure fields resolve <b>only</b>
 * through the {@link BqlFieldRegistry} allow-list with the caller's field-security gate applied; a
 * field the caller may not see, or an unknown alias, is rejected at compile time and never reaches
 * SQL. The optional source filter and the explicit {@code filters} fragment compile through
 * {@link BqlCompiler} as parameterized predicates — no user value is ever concatenated into SQL.
 *
 * <p>NFR guards (RB-40 §5, dashboard P95 1.5s): a dedicated 5-second-timeout JdbcTemplate,
 * {@value #MAX_DIMENSIONS} dimensions, {@value #MAX_MEASURES} measures, result rows clamped to
 * {@value #MAX_ROWS}, a {@value #MAX_CELLS} grand cell cap, and a batch cap of {@value #MAX_BATCH}.
 */
@Service
public class PivotService {

    static final int MAX_DIMENSIONS = 4;
    static final int MAX_MEASURES = 10;
    static final int MAX_ROWS = 1000;
    static final int MAX_CELLS = 5000;
    static final int MAX_BATCH = 12;
    private static final int QUERY_TIMEOUT_SECONDS = 5;
    /** LEAD+ may query leadership-sensitive fields — same gate the BQL controller applies. */
    private static final int SENSITIVE_FIELD_MIN_TIER = 3;

    // work_items rows visible to a workspace: their project lives in that workspace. The workspaceId
    // bind is always the FIRST parameter of every scoped query; per-source params follow (RB-40 §1).
    private static final String WORKSPACE_SCOPE =
        "deleted_at IS NULL AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)";

    private final JdbcTemplate jdbc;
    private final BqlCompiler compiler;
    private final RbacGate rbac;

    public PivotService(DataSource dataSource, BqlCompiler compiler, RbacGate rbac) {
        // A dedicated template so the per-query timeout never mutates the shared bean (as WidgetData).
        this.jdbc = new JdbcTemplate(dataSource);
        this.jdbc.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
        this.compiler = compiler;
        this.rbac = rbac;
    }

    /** A normalized pivot result: the dimension keys, the measure keys, and the data rows. */
    public record PivotResult(List<String> dimensions, List<String> measures,
                              List<Map<String, Object>> rows) { }

    /** One batch entry: the pivot id, its resolved result, or an error message (never both). */
    public record PivotBatchResult(String id, PivotResult data, String error) { }

    // ── Public API ──────────────────────────────────────────────────────────────────

    /**
     * Resolve one pivot spec. Membership gate doubles as the tenant boundary (RB-40 §1) — enforced
     * here, not the controller (RB-10 §2), so the engine is safe no matter who calls it.
     *
     * @throws ApiException on a bad spec or an over-limit request
     * @throws BqlException on an unknown/forbidden field or unparseable filter
     */
    public PivotResult resolve(String workspaceId, String userId, PivotSpec spec) {
        rbac.require(userId, workspaceId, "view_items");
        return resolveInternal(workspaceId, contextFor(userId, workspaceId), spec);
    }

    /**
     * Resolve one pivot for a workspace <b>without</b> the per-user RBAC gate — for the
     * unauthenticated public-dashboard embed only (RB-40 §1). There the share <em>token</em> is the
     * authorization and the workspace is resolved from the token, never a caller; the mandatory
     * {@link #WORKSPACE_SCOPE} workspace predicate remains the entire scope. A non-sensitive context
     * is used so leadership-sensitive fields stay hidden — a public viewer can never see more than a
     * non-privileged member would. Must only be called inside {@code TenantScope.callAsSystem}.
     *
     * @throws ApiException on a bad spec or an over-limit request
     * @throws BqlException on an unknown/forbidden field or unparseable filter
     */
    public PivotResult resolveForWorkspace(String workspaceId, PivotSpec spec) {
        return resolveInternal(workspaceId, BqlContext.forUser(null, false), spec);
    }

    /** Resolve many pivots in one pass; a failed entry carries its error, never aborting the rest. */
    public List<PivotBatchResult> batch(String workspaceId, String userId, Map<String, PivotSpec> specs) {
        rbac.require(userId, workspaceId, "view_items"); // one gate for the whole grid
        if (specs != null && specs.size() > MAX_BATCH) {
            throw ApiException.badRequest("BATCH_TOO_LARGE",
                "A pivot batch holds at most " + MAX_BATCH + " specs.", "items");
        }
        List<PivotBatchResult> out = new ArrayList<>();
        if (specs == null) {
            return out;
        }
        BqlContext ctx = contextFor(userId, workspaceId);
        for (Map.Entry<String, PivotSpec> e : specs.entrySet()) {
            try {
                out.add(new PivotBatchResult(e.getKey(),
                    resolveInternal(workspaceId, ctx, e.getValue()), null));
            } catch (ApiException | BqlException ex) {
                out.add(new PivotBatchResult(e.getKey(), null, ex.getMessage()));
            }
        }
        return out;
    }

    // ── Resolution (no membership gate — callers above authorize first) ────────────────

    private PivotResult resolveInternal(String workspaceId, BqlContext ctx, PivotSpec spec) {
        if (spec == null) {
            throw ApiException.badRequest("INVALID_PIVOT", "A pivot spec is required.", "spec");
        }
        if (spec.measures() == null || spec.measures().isEmpty()) {
            throw ApiException.badRequest("INVALID_PIVOT",
                "A pivot needs at least one measure.", "measures");
        }
        if (spec.measures().size() > MAX_MEASURES) {
            throw ApiException.badRequest("TOO_MANY_MEASURES",
                "A pivot supports at most " + MAX_MEASURES + " measures.", "measures");
        }
        List<String> dimAliases = spec.dimensions() == null ? List.of() : spec.dimensions();
        if (dimAliases.size() > MAX_DIMENSIONS) {
            throw ApiException.badRequest("TOO_MANY_DIMENSIONS",
                "A pivot supports at most " + MAX_DIMENSIONS + " dimensions.", "dimensions");
        }

        // Resolve every dimension/measure column ONLY through the allow-list + field-security gate.
        List<DimCol> dims = new ArrayList<>();
        for (String alias : dimAliases) {
            if (alias == null || alias.isBlank()) {
                throw ApiException.badRequest("INVALID_DIMENSION", "A dimension alias is blank.", "dimensions");
            }
            BqlField f = BqlFieldRegistry.resolve(alias.trim(), ctx); // throws on unknown/forbidden
            dims.add(new DimCol(f.alias(), f.column()));
        }
        List<MeasureCol> measures = new ArrayList<>();
        for (PivotSpec.Measure m : spec.measures()) {
            measures.add(resolveMeasure(m, ctx));
        }

        // Compose the WHERE: workspace scope + the source filter + the explicit filters fragment.
        // Both filters compile through BQL → parameterized, field-secured, never concatenated.
        List<Object> params = new ArrayList<>();
        params.add(workspaceId);
        StringBuilder where = new StringBuilder(WORKSPACE_SCOPE);
        appendBql(where, params, sourceBql(spec.source()), ctx);
        appendBql(where, params, spec.filters(), ctx);

        return runPivot(dims, measures, where.toString(), params);
    }

    /** A resolved dimension: the alias used as the result key, and its real column (from allow-list). */
    private record DimCol(String key, String column) { }

    /**
     * A resolved measure: the result key, the SQL aggregate expression, and whether it must be
     * post-processed as a percent-of-total over the grouped rows.
     */
    private record MeasureCol(String key, String sqlExpr, boolean percentOfTotal) { }

    private MeasureCol resolveMeasure(PivotSpec.Measure m, BqlContext ctx) {
        if (m == null || m.agg() == null) {
            throw ApiException.badRequest("INVALID_MEASURE", "A measure needs an aggregation.", "measures");
        }
        String rawField = m.field() == null ? "" : m.field().trim();
        boolean star = rawField.isEmpty() || "*".equals(rawField);

        // COUNT / COUNT_DISTINCT / PERCENT_OF_TOTAL over '*' are row counts — no field needed.
        // Everything else needs an allow-listed, field-secured column.
        String column;
        String keyField;
        if (star) {
            if (m.agg() != PivotSpec.Agg.COUNT
                && m.agg() != PivotSpec.Agg.COUNT_DISTINCT
                && m.agg() != PivotSpec.Agg.PERCENT_OF_TOTAL) {
                throw ApiException.badRequest("INVALID_MEASURE",
                    m.agg() + " needs a field; only COUNT, COUNT_DISTINCT and PERCENT_OF_TOTAL "
                    + "may aggregate '*'.", "measures");
            }
            column = "*";
            keyField = "all";
        } else {
            BqlField f = BqlFieldRegistry.resolve(rawField, ctx); // throws on unknown/forbidden
            column = f.column();
            keyField = f.alias();
        }

        String key = m.agg().name().toLowerCase(Locale.ROOT) + "_" + keyField;
        String expr = switch (m.agg()) {
            case COUNT -> star ? "COUNT(*)" : "COUNT(" + column + ")";
            case COUNT_DISTINCT -> "COUNT(DISTINCT " + ("*".equals(column) ? "id" : column) + ")";
            case SUM -> "SUM(" + column + ")";
            case AVG -> "AVG(" + column + ")";
            case MIN -> "MIN(" + column + ")";
            case MAX -> "MAX(" + column + ")";
            case MEDIAN -> "percentile_cont(0.5) WITHIN GROUP (ORDER BY " + column + ")";
            case P85 -> "percentile_cont(0.85) WITHIN GROUP (ORDER BY " + column + ")";
            // Percent of the grand total of row counts per group — computed in two steps below.
            case PERCENT_OF_TOTAL -> "COUNT(*)";
        };
        return new MeasureCol(key, expr, m.agg() == PivotSpec.Agg.PERCENT_OF_TOTAL);
    }

    /**
     * Build and run the aggregate query. Dimension columns and aggregate expressions come ONLY from
     * the allow-list resolution above (never raw user text), so inlining them is injection-safe; all
     * user values are bound parameters carried in {@code params} (RB-10 §6).
     */
    private PivotResult runPivot(List<DimCol> dims, List<MeasureCol> measures,
                                 String where, List<Object> params) {
        // Reject up-front when the dimension cardinality could exceed the cell budget is impossible
        // to know before running; instead we clamp the row count and verify the cell budget after.
        StringBuilder sql = new StringBuilder("SELECT ");
        List<String> selectParts = new ArrayList<>();
        for (DimCol d : dims) {
            // COALESCE so a NULL dimension becomes a stable 'None' bucket, like the widget grouper.
            selectParts.add("COALESCE(CAST(" + d.column() + " AS TEXT), 'None') AS " + d.key());
        }
        for (MeasureCol m : measures) {
            selectParts.add(m.sqlExpr() + " AS " + m.key());
        }
        sql.append(String.join(", ", selectParts));
        sql.append(" FROM work_items WHERE ").append(where);

        if (!dims.isEmpty()) {
            List<String> groupBy = new ArrayList<>();
            for (int i = 1; i <= dims.size(); i++) {
                groupBy.add(String.valueOf(i)); // GROUP BY ordinal — references the SELECT dim exprs
            }
            sql.append(" GROUP BY ").append(String.join(", ", groupBy));
            // Order by the first measure descending for a stable, useful default ordering.
            sql.append(" ORDER BY ").append(measures.get(0).key()).append(" DESC NULLS LAST");
            sql.append(" LIMIT ").append(MAX_ROWS);
        }

        List<Map<String, Object>> rows = jdbc.queryForList(sql.toString(), params.toArray());

        // Cell budget: rows × (dimensions + measures) (RB-40 §5 — a pivot cannot fan out unbounded).
        long cells = (long) rows.size() * (dims.size() + measures.size());
        if (cells > MAX_CELLS) {
            throw ApiException.badRequest("PIVOT_TOO_LARGE",
                "This pivot produces too many cells (" + cells + " > " + MAX_CELLS
                + "). Add a filter or remove a dimension.", "dimensions");
        }

        applyPercentOfTotal(rows, measures);

        List<String> dimKeys = dims.stream().map(DimCol::key).toList();
        List<String> measureKeys = measures.stream().map(MeasureCol::key).toList();
        return new PivotResult(dimKeys, measureKeys, rows);
    }

    /** Convert any PERCENT_OF_TOTAL measure's raw count into its share (0..100) of the column total. */
    private void applyPercentOfTotal(List<Map<String, Object>> rows, List<MeasureCol> measures) {
        for (MeasureCol m : measures) {
            if (!m.percentOfTotal()) {
                continue;
            }
            double total = 0;
            for (Map<String, Object> row : rows) {
                total += toDouble(row.get(m.key()));
            }
            for (Map<String, Object> row : rows) {
                double v = toDouble(row.get(m.key()));
                row.put(m.key(), total == 0 ? 0d
                    : Math.round((v / total) * 10000.0) / 100.0); // two decimals
            }
        }
    }

    private static double toDouble(Object o) {
        return o instanceof Number n ? n.doubleValue() : 0d;
    }

    // ── BQL composition helpers ─────────────────────────────────────────────────────

    /** Compile a BQL fragment and AND it into the WHERE, carrying its bind params (or no-op if blank). */
    private void appendBql(StringBuilder where, List<Object> params, String bql, BqlContext ctx) {
        if (bql == null || bql.isBlank()) {
            return;
        }
        BqlCompiler.Compiled c = compiler.compileFor(bql, ctx);
        if (!c.sql().isEmpty()) {
            where.append(" AND (").append(c.sql()).append(')');
            params.addAll(c.params());
        }
    }

    /** Turn the optional source into a BQL fragment: metric sources carry no extra filter here. */
    private String sourceBql(WidgetSource source) {
        if (source == null || source.kind() == null) {
            return "";
        }
        return switch (source.kind().toLowerCase(Locale.ROOT)) {
            case "bql" -> source.query();
            case "guided" -> WidgetDataService.guidedToBql(source.guided());
            // A curated metric already encodes its own WHERE in the widget executor; in the pivot
            // engine the dimensions/measures define the shape, so a metric source contributes no
            // extra filter — its name is advisory. (Kept for parity with WidgetSource's three kinds.)
            case "metric" -> "";
            default -> throw ApiException.badRequest("INVALID_SOURCE",
                "Unknown pivot source kind: " + source.kind() + ".", "source");
        };
    }

    private BqlContext contextFor(String userId, String workspaceId) {
        boolean canSeeSensitive = rbac.getUserTier(userId, workspaceId) >= SENSITIVE_FIELD_MIN_TIER;
        return BqlContext.forUser(userId, canSeeSensitive);
    }
}
