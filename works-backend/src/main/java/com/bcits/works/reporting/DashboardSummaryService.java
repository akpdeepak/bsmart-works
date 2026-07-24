package com.bcits.works.reporting;

import com.bcits.works.AiCapabilities;
import com.bcits.works.ai.api.AiControlPlaneService;
import com.bcits.works.shared.RbacGate;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Cap J · AI dashboard/chart summary + anomaly explanation (RB-40 §2). The client passes the series
 * it has <em>already aggregated and rendered</em> — this service never re-queries {@code work_items},
 * so there is no tenant-scoped data access here; the controller still proves {@code view_items}
 * membership before the workspace's AI budget is touched (RB-10 §2, RB-40 §1).
 *
 * <p>The narrative routes through the one {@link AiControlPlaneService#invoke} entry point so scope,
 * budget, caching and audit are enforced centrally. The deterministic {@link #renderDigest} — the
 * largest bucket, notable deltas and statistical outliers over the supplied series — is the mandatory
 * fallback served verbatim when AI is off, over budget or unavailable (no fallback = it does not
 * ship). It is a pure function, unit-testable without a database (RB-10 §7).
 */
@Service
public class DashboardSummaryService {

    private final AiControlPlaneService controlPlane;
    private final RbacGate rbac;

    public DashboardSummaryService(AiControlPlaneService controlPlane, RbacGate rbac) {
        this.controlPlane = controlPlane;
        this.rbac = rbac;
    }

    /** One labelled bucket of an already-aggregated chart series. */
    public record Point(String label, double value) { }

    /** The summary plus the control-plane verdict, so the UI can show provenance honestly. */
    public record Summary(String text, boolean usedAi, boolean fallback, String policyState, String tier) { }

    /**
     * Summarise an already-rendered dashboard/chart series. RBAC ({@code view_items}) is enforced
     * here at the service boundary (RB-10 §2) before the workspace AI budget is touched.
     */
    public Summary summarize(String workspaceId, String userId, String title,
                             List<Point> series, boolean inContext) {
        rbac.require(userId, workspaceId, "view_items");

        String deterministic = renderDigest(title, series);
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.DASHBOARD_SUMMARY,
            "Summarise this dashboard series and explain any anomalies: " + deterministic,
            deterministic, null, inContext));
        String text = out.fallback() || out.text() == null ? deterministic : out.text();
        return new Summary(text, out.usedAi(), out.fallback(), out.policyState(),
            out.tier() == null ? "NONE" : out.tier().name());
    }

    /**
     * Deterministic structured digest of an already-aggregated series — the mandatory fallback.
     * Pure: largest bucket, share of total, and statistical outliers (values beyond mean ± 2·stddev).
     */
    static String renderDigest(String title, List<Point> series) {
        List<Point> points = series == null ? List.of()
            : series.stream().filter(p -> p != null && p.label() != null).toList();
        String heading = (title == null || title.isBlank()) ? "this view" : title.trim();
        if (points.isEmpty()) {
            return "No data to summarise for " + heading + ".";
        }

        double total = points.stream().mapToDouble(Point::value).sum();
        Point largest = points.get(0);
        Point smallest = points.get(0);
        for (Point p : points) {
            if (p.value() > largest.value()) {
                largest = p;
            }
            if (p.value() < smallest.value()) {
                smallest = p;
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format(Locale.ROOT,
            "%s: %d categories totalling %s.", heading, points.size(), fmt(total)));
        double largestShare = total == 0 ? 0 : (largest.value() / total) * 100.0;
        sb.append(String.format(Locale.ROOT,
            " Largest is \"%s\" at %s (%.0f%% of total)", largest.label(), fmt(largest.value()), largestShare));
        if (points.size() > 1 && smallest != largest) {
            sb.append(String.format(Locale.ROOT,
                "; smallest is \"%s\" at %s.", smallest.label(), fmt(smallest.value())));
        } else {
            sb.append('.');
        }

        List<String> anomalies = outliers(points);
        if (anomalies.isEmpty()) {
            sb.append(" No statistical outliers detected.");
        } else {
            sb.append(" Notable outliers: ").append(String.join(", ", anomalies)).append('.');
        }
        return sb.toString();
    }

    /**
     * Buckets that stand out from the rest of the series. Pure. A value is an outlier when it lies
     * beyond two sample standard deviations from the mean, or — robustly for small series where a
     * single spike inflates its own stddev — when it dominates at three times the next-largest value.
     */
    private static List<String> outliers(List<Point> points) {
        int n = points.size();
        List<String> out = new ArrayList<>();
        if (n < 3) {
            return out;
        }
        double mean = points.stream().mapToDouble(Point::value).sum() / n;
        double variance = points.stream().mapToDouble(p -> {
            double d = p.value() - mean;
            return d * d;
        }).sum() / (n - 1);                       // sample standard deviation
        double stddev = Math.sqrt(variance);

        // Dominance check: the single largest bucket at >= 3x the next-largest is always notable.
        List<Double> sorted = points.stream().map(Point::value).sorted().toList();
        double largest = sorted.get(n - 1);
        double secondLargest = sorted.get(n - 2);
        double dominanceFloor = secondLargest > 0 ? secondLargest * 3 : Double.MAX_VALUE;

        for (Point p : points) {
            boolean bySigma = stddev > 0 && Math.abs(p.value() - mean) > 2 * stddev;
            boolean byDominance = p.value() == largest && largest >= dominanceFloor && largest > mean;
            if (bySigma || byDominance) {
                String dir = p.value() > mean ? "above" : "below";
                out.add(String.format(Locale.ROOT, "\"%s\" (%s, well %s the mean of %s)",
                    p.label(), fmt(p.value()), dir, fmt(mean)));
            }
        }
        return out;
    }

    private static String fmt(double v) {
        if (v == Math.rint(v) && !Double.isInfinite(v)) {
            return String.format(Locale.ROOT, "%d", (long) v);
        }
        return String.format(Locale.ROOT, "%.1f", v);
    }

    /** Maps the request body's loosely-typed points into the typed series, skipping malformed rows. */
    public static List<Point> toSeries(List<Map<String, Object>> raw) {
        List<Point> series = new ArrayList<>();
        if (raw == null) {
            return series;
        }
        for (Map<String, Object> row : raw) {
            if (row == null) {
                continue;
            }
            Object label = row.get("label");
            Object value = row.get("value");
            if (label == null || !(value instanceof Number num)) {
                continue;
            }
            series.add(new Point(String.valueOf(label), num.doubleValue()));
        }
        return series;
    }
}
