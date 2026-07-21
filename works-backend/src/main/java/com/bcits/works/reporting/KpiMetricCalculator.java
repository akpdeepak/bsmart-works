package com.bcits.works.reporting;

import com.bcits.works.workitems.WorkItem;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Pure, deterministic KPI computation kernel — extracted from {@link KpiService} (Phase 2 / W2
 * god-class split). Every method is {@code static} and database-free so it is unit-testable in
 * isolation (RB-10 §7); the aggregation primitives it builds on live in {@link MetricFormula}.
 *
 * <p>This class holds <b>no</b> tenant, RBAC, or field-level-security logic — those stay in
 * {@link KpiService}, which orchestrates these calculations over workspace-scoped work items
 * (RB-40 §1). Moving computation here does not change any observable behaviour.
 */
final class KpiMetricCalculator {

    private KpiMetricCalculator() { }

    private static final String DONE = "done";
    private static final List<String> WIP_STATUSES = List.of("in progress", "in review", "doing", "qa", "testing");

    static boolean isDone(WorkItem w) {
        return w.getStatus() != null && w.getStatus().trim().toLowerCase(Locale.ROOT).equals(DONE);
    }

    static boolean isWip(WorkItem w) {
        String s = w.getStatus() == null ? "" : w.getStatus().trim().toLowerCase(Locale.ROOT);
        return WIP_STATUSES.contains(s);
    }

    static double velocity(List<WorkItem> items) {
        return MetricFormula.round1(items.stream()
            .filter(KpiMetricCalculator::isDone)
            .mapToInt(w -> w.getStoryPoints() == null ? 0 : w.getStoryPoints())
            .sum());
    }

    static double doneCount(List<WorkItem> items) {
        return doneCountInt(items);
    }

    static int doneCountInt(List<WorkItem> items) {
        return (int) items.stream().filter(KpiMetricCalculator::isDone).count();
    }

    static double completionRate(List<WorkItem> items) {
        return MetricFormula.ratio(doneCountInt(items), items.size());
    }

    static double wipCount(List<WorkItem> items) {
        return items.stream().filter(KpiMetricCalculator::isWip).count();
    }

    static double bugEscapeRate(List<WorkItem> items) {
        long bugs = items.stream().filter(w -> "Bug".equalsIgnoreCase(nv(w.getType()))).count();
        return MetricFormula.ratio(bugs, items.size());
    }

    static double cycleTimeP85(List<WorkItem> items) {
        List<Double> hours = items.stream().filter(KpiMetricCalculator::isDone)
            .map(KpiMetricCalculator::cycleHours).collect(Collectors.toList());
        return MetricFormula.percentile(hours, 85);
    }

    /** Scope stability: share of items NOT added late (no sprint reassignment proxy) — higher is better. */
    static double scopeStability(List<WorkItem> items) {
        if (items.isEmpty()) {
            return 0;
        }
        long stable = items.stream().filter(w -> w.getSprintId() != null).count();
        // Proxy: items planned into a sprint vs total. Empty backlog churn → treat as fully stable.
        return stable == 0 ? 100.0 : MetricFormula.ratio(stable, items.size());
    }

    /** Flow efficiency: share of work that is moving (done or WIP) rather than stuck in backlog. */
    static double flowEfficiency(List<WorkItem> items) {
        if (items.isEmpty()) {
            return 0;
        }
        long flowing = items.stream().filter(w -> isDone(w) || isWip(w)).count();
        return MetricFormula.ratio(flowing, items.size());
    }

    static String band(double percent) {
        if (percent >= 80) {
            return "healthy";
        }
        return percent >= 60 ? "watch" : "risk";
    }

    static List<Integer> bucketize(List<Double> hours, int[] edges) {
        int[] counts = new int[edges.length + 1];
        for (Double h : hours) {
            if (h == null) {
                continue;
            }
            int b = edges.length;
            for (int i = 0; i < edges.length; i++) {
                if (h <= edges[i]) {
                    b = i;
                    break;
                }
            }
            counts[b]++;
        }
        List<Integer> out = new ArrayList<>();
        for (int c : counts) {
            out.add(c);
        }
        return out;
    }

    /**
     * Cycle time in hours: how long the item took, not how old it is. For a <b>done</b> item we
     * measure from creation to the moment it last changed status ({@code statusChangedAt}, V74) — the
     * completion timestamp proxy — so a finished item's cycle time is stable and never grows with
     * wall-clock time. For an item that is still open (or that predates the status-timestamp backfill
     * and so has no {@code statusChangedAt}) we measure to now, giving its current age-in-flight.
     * This is the fix for the "cycle time keeps climbing forever" defect (RB-20 §4 honest metrics).
     */
    static double cycleHours(WorkItem w) {
        if (w.getCreatedAt() == null) {
            return 0;
        }
        OffsetDateTime end = (isDone(w) && w.getStatusChangedAt() != null)
            ? w.getStatusChangedAt()
            : OffsetDateTime.now();
        return Math.max(0, Duration.between(w.getCreatedAt(), end).toHours());
    }

    /** Evaluates ON_TRACK / AT_RISK / OFF_TRACK against a numeric target (RB-10 §6 KPI evaluation). */
    static String evaluateStatus(double actual, Double target, boolean higherIsBetter) {
        if (target == null || target <= 0) {
            return null;
        }
        double denom = higherIsBetter ? target : Math.max(actual, 0.001);
        double numer = higherIsBetter ? actual : target;
        double ratio = numer / denom;
        if (ratio >= 1.0) {
            return "ON_TRACK";
        }
        if (ratio >= 0.75) {
            return "AT_RISK";
        }
        return "OFF_TRACK";
    }

    private static String nv(Object o) {
        return o == null ? "" : o.toString();
    }
}
