package com.bcits.works;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory performance monitor (iteration 18, Cap S — "Performance SLAs: P95 latency targets per
 * operation. Monitoring."). Records per-operation request durations in a bounded ring buffer and
 * computes P50/P95/P99, comparing them against the NFR budgets in RB-40 §5. The status page and the
 * observability endpoint read this; in CI a regression test can assert against the budgets.
 *
 * <p>Bounded and lock-light: at most {@link #WINDOW} recent samples per operation, so memory stays
 * flat under load. Percentile maths is pure (see {@link #percentile}) and unit-tested.
 */
@Component
public class PerformanceMonitor {

    /** Recent samples kept per operation. */
    static final int WINDOW = 1000;

    /** P95 budget per operation, in milliseconds (RB-40 §5). 0 = no published budget. */
    static final Map<String, Long> P95_BUDGET_MS = Map.of(
            "page_load", 800L,
            "work_item_create", 300L,
            "search", 500L,
            "dashboard_render", 1500L,
            "ai_cached", 300L,
            "ai_uncached", 5000L,
            "file_upload", 3000L);

    private final Map<String, long[]> samples = new ConcurrentHashMap<>();
    private final Map<String, Integer> counts = new ConcurrentHashMap<>();

    /** Record one observation (milliseconds) for an operation key. */
    public void record(String operation, long millis) {
        if (operation == null) {
            return;
        }
        long[] ring = samples.computeIfAbsent(operation, k -> new long[WINDOW]);
        synchronized (ring) {
            int n = counts.getOrDefault(operation, 0);
            ring[n % WINDOW] = millis;
            counts.put(operation, n + 1);
        }
    }

    /** Per-operation snapshot: count, p50, p95, p99, max, budget, and over-budget flag. */
    public Map<String, Object> snapshot() {
        Map<String, Object> out = new LinkedHashMap<>();
        for (String op : samples.keySet()) {
            long[] ring = samples.get(op);
            long[] copy;
            int n;
            synchronized (ring) {
                n = Math.min(counts.getOrDefault(op, 0), WINDOW);
                copy = Arrays.copyOf(ring, n);
            }
            if (n == 0) {
                continue;
            }
            Arrays.sort(copy);
            List<Long> sorted = new ArrayList<>(n);
            for (long v : copy) {
                sorted.add(v);
            }
            long p95 = percentile(sorted, 95);
            Long budget = P95_BUDGET_MS.get(op);
            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("count", counts.getOrDefault(op, 0));
            stat.put("p50", percentile(sorted, 50));
            stat.put("p95", p95);
            stat.put("p99", percentile(sorted, 99));
            stat.put("max", sorted.get(n - 1));
            stat.put("budgetP95", budget);
            stat.put("overBudget", budget != null && p95 > budget);
            out.put(op, stat);
        }
        return out;
    }

    /**
     * Nearest-rank percentile of an ascending-sorted list. {@code p} in [0,100]. Returns 0 for an
     * empty list. Pure — the unit of the performance maths.
     */
    static long percentile(List<Long> sortedAscending, int p) {
        if (sortedAscending == null || sortedAscending.isEmpty()) {
            return 0;
        }
        if (p <= 0) {
            return sortedAscending.get(0);
        }
        if (p >= 100) {
            return sortedAscending.get(sortedAscending.size() - 1);
        }
        int rank = (int) Math.ceil(p / 100.0 * sortedAscending.size());
        int index = Math.min(Math.max(rank - 1, 0), sortedAscending.size() - 1);
        return sortedAscending.get(index);
    }
}
