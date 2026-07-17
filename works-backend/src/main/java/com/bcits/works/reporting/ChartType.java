package com.bcits.works.reporting;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The closed registry of chart types a {@link PivotResult} can render in, with each type's supported
 * shape (min/max dimensions, min/max measures). This is the single source of truth the frontend
 * reads to <b>offer every chart with guidance</b> — it can show all types and tell the user which
 * fit the current pivot's shape, rather than each surface hard-coding its own chart list.
 *
 * <p>Pure metadata, no DB and no tenant data — exposed via {@code GET /api/v1/widget-data/chart-types}.
 */
public record ChartType(String id, String label,
                        int minDimensions, int maxDimensions,
                        int minMeasures, int maxMeasures) {

    // Unbounded upper limit sentinel — a chart that accepts any number of dims/measures.
    private static final int ANY = Integer.MAX_VALUE;

    private static final List<ChartType> REGISTRY = List.of(
        // Single-number cards: no dimension, one measure.
        new ChartType("scorecard", "Scorecard", 0, 0, 1, 1),
        new ChartType("gauge", "Gauge", 0, 0, 1, 1),
        new ChartType("sparkline", "Sparkline", 0, 1, 1, 1),
        // Part-to-whole: one dimension, one measure.
        new ChartType("pie", "Pie", 1, 1, 1, 1),
        new ChartType("donut", "Donut", 1, 1, 1, 1),
        new ChartType("funnel", "Funnel", 1, 1, 1, 1),
        new ChartType("treemap", "Treemap", 1, 2, 1, 1),
        // Categorical comparison: one dimension, one or more measures.
        new ChartType("bar", "Bar", 1, 1, 1, ANY),
        new ChartType("column", "Column", 1, 1, 1, ANY),
        new ChartType("line", "Line", 1, 2, 1, ANY),
        new ChartType("area", "Area", 1, 2, 1, ANY),
        new ChartType("combo", "Combo", 1, 1, 2, ANY),
        // Two-dimension comparisons.
        new ChartType("stacked_bar", "Stacked bar", 2, 2, 1, 1),
        new ChartType("grouped_bar", "Grouped bar", 2, 2, 1, 1),
        new ChartType("heatmap", "Heatmap", 2, 2, 1, 1),
        new ChartType("matrix", "Matrix", 2, 2, 1, ANY),
        // Correlation: no dimension, two/three measures.
        new ChartType("scatter", "Scatter", 0, 1, 2, 2),
        new ChartType("bubble", "Bubble", 0, 1, 3, 3),
        // The raw tabular fallback — renders any shape.
        new ChartType("pivot_table", "Pivot table", 0, ChartType.ANY, 1, ANY));

    /** The full registry, in display order. */
    public static List<ChartType> all() {
        return REGISTRY;
    }

    /** Describe the registry for the API: id, label, and the supported-shape bounds per type. */
    public static List<Map<String, Object>> describe() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (ChartType c : REGISTRY) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", c.id());
            row.put("label", c.label());
            row.put("minDimensions", c.minDimensions());
            // Emit unbounded as null so the client reads "no maximum" rather than a magic int.
            row.put("maxDimensions", c.maxDimensions() == ANY ? null : c.maxDimensions());
            row.put("minMeasures", c.minMeasures());
            row.put("maxMeasures", c.maxMeasures() == ANY ? null : c.maxMeasures());
            out.add(row);
        }
        return out;
    }
}
