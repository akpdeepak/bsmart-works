package com.bcits.works.reporting;

import java.util.List;

/**
 * A multi-dimensional pivot request — the shared core that lets any data source render in any chart
 * type with 0…N dimensions. Dashboards, the Report Builder, and Reports all describe their data with
 * this one spec, so tenant scope (RB-40 §1), field-level security, and BQL bind-safety (RB-10 §6) are
 * enforced once in {@link PivotService}, not re-implemented per surface.
 *
 * <ul>
 *   <li>{@code source} — reuses {@link WidgetSource} so a pivot can be driven by a curated metric, a
 *       guided spec, or raw BQL; the source's own filter becomes part of the {@code WHERE}.</li>
 *   <li>{@code measures} — the aggregates to compute (1…N). Each is a typed {@link Measure}.</li>
 *   <li>{@code dimensions} — the group-by field aliases (0…N), resolved <b>only</b> through the
 *       {@link BqlFieldRegistry} allow-list, so a dimension can never be arbitrary user text.</li>
 *   <li>{@code filters} — an extra BQL fragment, compiled through {@link BqlCompiler} like any
 *       other query (workspace-scoped + field-security at compilation).</li>
 * </ul>
 */
public record PivotSpec(
    WidgetSource source,
    List<Measure> measures,
    List<String> dimensions,
    String filters
) {

    /**
     * One aggregate column: the field to aggregate (an allow-listed BQL alias, or {@code "*"} for a
     * row count) and the aggregation to apply. The field resolves through the same allow-list and
     * field-level-security gate as a dimension — a measure can never reference a forbidden column.
     */
    public record Measure(String field, Agg agg) { }

    /** The supported aggregations. SQL-native ones map directly; statistical ones use Postgres. */
    public enum Agg {
        COUNT,
        SUM,
        AVG,
        MIN,
        MAX,
        COUNT_DISTINCT,
        MEDIAN,
        P85,
        PERCENT_OF_TOTAL
    }
}
