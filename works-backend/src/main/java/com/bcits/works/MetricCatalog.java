package com.bcits.works;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The default KPI metric catalog (iteration 12, Cap L) — reasonable BCITS defaults that work out of
 * the box (RB-20 §3 "defaults for the 80%"). Each metric declares its safe aggregate primitive, the
 * scope level at which it is reported, its unit, and whether higher is better (for health colouring).
 *
 * <p>This is a pure registry (no I/O) so it is unit-testable in isolation and doubles as the
 * deterministic source of truth the {@code KpiService} computes against and the UI renders from.
 */
public final class MetricCatalog {

    private MetricCatalog() { }

    /** A catalogued metric. {@code privateByDefault} metrics are INDIVIDUAL and never aggregated to
     *  another person without an explicit share (RB-40 §1). */
    public record Metric(String key, String label, String primitive, String sourceField,
                         String unit, String scopeLevel, boolean higherIsBetter, boolean privateByDefault) { }

    public static final String VELOCITY            = "velocity";
    public static final String COMMITMENT_ACCURACY = "commitment_accuracy";
    public static final String CYCLE_TIME          = "cycle_time";
    public static final String LEAD_TIME           = "lead_time";
    public static final String REWORK              = "rework";
    public static final String WIP                 = "wip";
    public static final String BLOCKED_TIME        = "blocked_time";
    public static final String BUG_ESCAPE          = "bug_escape";
    public static final String PR_TURNAROUND       = "pr_turnaround";
    public static final String THROUGHPUT          = "throughput";
    public static final String COMPLETION_RATE     = "completion_rate";

    private static final List<Metric> ALL = List.of(
        new Metric(VELOCITY,            "Velocity",             "SUM",        "storyPoints", "points",  "TEAM",       true,  false),
        new Metric(COMMITMENT_ACCURACY, "Commitment accuracy",  "RATIO",      "storyPoints", "percent", "TEAM",       true,  false),
        new Metric(CYCLE_TIME,          "Cycle time",           "PERCENTILE", "cycleHours",  "hours",   "TEAM",       false, false),
        new Metric(LEAD_TIME,           "Lead time",            "PERCENTILE", "leadHours",   "hours",   "TEAM",       false, false),
        new Metric(REWORK,              "Rework",               "RATIO",      "reopened",    "percent", "TEAM",       false, false),
        new Metric(WIP,                 "Work in progress",     "COUNT",      "status",      "count",   "TEAM",       false, false),
        new Metric(BLOCKED_TIME,        "Blocked time",         "AVG",        "blockedHours","hours",   "TEAM",       false, false),
        new Metric(BUG_ESCAPE,          "Bug escape rate",      "RATIO",      "type",        "percent", "PROJECT",    false, false),
        new Metric(PR_TURNAROUND,       "PR turnaround",        "PERCENTILE", "reviewHours", "hours",   "TEAM",       false, false),
        new Metric(THROUGHPUT,          "Throughput",           "COUNT",      "status",      "count",   "INDIVIDUAL", true,  true),
        new Metric(COMPLETION_RATE,     "Completion rate",      "RATIO",      "status",      "percent", "INDIVIDUAL", true,  true)
    );

    private static final Map<String, Metric> BY_KEY =
        ALL.stream().collect(Collectors.toMap(Metric::key, m -> m));

    public static List<Metric> all() {
        return ALL;
    }

    /** Metrics that are private to the individual by default (the personal view, RB-40 §1). */
    public static List<Metric> personalMetrics() {
        return ALL.stream().filter(Metric::privateByDefault).collect(Collectors.toList());
    }

    /** Metrics reported at aggregate scopes (team / project / org). */
    public static List<Metric> aggregateMetrics() {
        return ALL.stream().filter(m -> !m.privateByDefault()).collect(Collectors.toList());
    }

    public static boolean isKnown(String key) {
        return BY_KEY.containsKey(key);
    }

    public static Metric get(String key) {
        return BY_KEY.get(key);
    }
}
