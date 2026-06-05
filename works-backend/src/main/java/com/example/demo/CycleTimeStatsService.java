package com.example.demo;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Pure statistics for the cycle-time distribution (iteration 12, Cap L · "Cycle time distribution").
 * Computes median, P85, a day-bucketed histogram and an outlier threshold from a list of cycle times
 * (in days). No I/O — {@link KpiComputationService} supplies the values — so the maths is unit-tested
 * directly. These are aggregate statistics only; no individual is identified.
 */
@Service
public class CycleTimeStatsService {

    /** Day-boundary buckets for the histogram; the last bucket is open-ended. */
    static final double[] BUCKET_BOUNDS = {1, 2, 3, 5, 8, 13, 21};

    /** Median, P85, mean, sample size, histogram and the outlier threshold (P85 × 1.5). */
    public record Distribution(double median, double p85, double mean, int count,
                               List<Map<String, Object>> histogram, double outlierThreshold) {}

    /**
     * Linear-interpolation percentile over the values (p in 1..99). Empty → 0. Matches the common
     * "P85" reading used on flow dashboards.
     */
    public double percentile(List<Double> values, double p) {
        if (values == null || values.isEmpty()) {
            return 0.0;
        }
        List<Double> sorted = new ArrayList<>(values);
        sorted.sort(Double::compareTo);
        if (sorted.size() == 1) {
            return sorted.get(0);
        }
        double rank = (p / 100.0) * (sorted.size() - 1);
        int lo = (int) Math.floor(rank);
        int hi = (int) Math.ceil(rank);
        double frac = rank - lo;
        return sorted.get(lo) + frac * (sorted.get(hi) - sorted.get(lo));
    }

    public double mean(List<Double> values) {
        if (values == null || values.isEmpty()) {
            return 0.0;
        }
        return values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }

    /** Build the full distribution. Outlier threshold is P85 × 1.5 (flow-dashboard convention). */
    public Distribution distribution(List<Double> values) {
        List<Double> v = values == null ? List.of() : values;
        double median = round(percentile(v, 50));
        double p85 = round(percentile(v, 85));
        double mean = round(mean(v));
        double threshold = round(p85 * 1.5);
        return new Distribution(median, p85, mean, v.size(), histogram(v), threshold);
    }

    /** Day-bucketed histogram: <1d, 1-2d, 2-3d, 3-5d, 5-8d, 8-13d, 13-21d, 21d+. */
    public List<Map<String, Object>> histogram(List<Double> values) {
        int[] counts = new int[BUCKET_BOUNDS.length + 1];
        if (values != null) {
            for (double d : values) {
                counts[bucketIndex(d)]++;
            }
        }
        List<Map<String, Object>> out = new ArrayList<>();
        double prev = 0;
        for (int i = 0; i < BUCKET_BOUNDS.length; i++) {
            out.add(bucket(label(prev, BUCKET_BOUNDS[i]), counts[i]));
            prev = BUCKET_BOUNDS[i];
        }
        out.add(bucket((long) prev + "d+", counts[BUCKET_BOUNDS.length]));
        return out;
    }

    private int bucketIndex(double days) {
        for (int i = 0; i < BUCKET_BOUNDS.length; i++) {
            if (days < BUCKET_BOUNDS[i]) {
                return i;
            }
        }
        return BUCKET_BOUNDS.length;
    }

    private String label(double from, double to) {
        if (from == 0) {
            return "<" + (long) to + "d";
        }
        return (long) from + "-" + (long) to + "d";
    }

    private Map<String, Object> bucket(String label, int count) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("value", count);
        return m;
    }

    private double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
