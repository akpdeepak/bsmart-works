package com.bcits.works;

import java.util.List;

/**
 * A widget's data definition — one of three kinds, resolved by {@link WidgetDataService}:
 *
 * <ul>
 *   <li>{@code metric} — a curated, named aggregate from the metric registry (key = metric id).</li>
 *   <li>{@code guided} — a structured filter spec compiled to BQL server-side (visual BQL builder).</li>
 *   <li>{@code bql} — a raw BQL query (power users).</li>
 * </ul>
 *
 * <p>All three resolve to the same workspace-scoped execution path, so tenancy and field safety
 * are enforced once (RB-40 §1, RB-10 §6) regardless of how the user authored the source.
 *
 * <p>{@code mode} applies to guided/bql: {@code count} → a scalar, {@code group} → a
 * {label,value} series grouped by {@code groupBy}, {@code list} → up to {@code limit} rows.
 */
public record WidgetSource(
    String kind,        // metric | guided | bql
    String key,         // metric: the registry key
    String query,       // bql: the raw query
    GuidedSpec guided,  // guided: the structured spec
    String mode,        // guided/bql: count | group | list  (default count)
    String groupBy,     // group mode: status | type | priority
    Integer limit       // list mode: row cap (clamped 1..50)
) {

    /** Structured guided spec — a constrained surface that compiles to BQL. */
    public record GuidedSpec(
        Boolean mine,
        Boolean open,
        Boolean overdue,
        List<String> types,
        List<String> priorities
    ) { }
}
