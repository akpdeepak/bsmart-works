package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class PerformanceMonitorTest {

    @Test
    void percentileNearestRank() {
        List<Long> data = List.of(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 9L, 10L);
        assertEquals(5L, PerformanceMonitor.percentile(data, 50));
        assertEquals(10L, PerformanceMonitor.percentile(data, 95));
        assertEquals(10L, PerformanceMonitor.percentile(data, 99));
        assertEquals(1L, PerformanceMonitor.percentile(data, 0));
    }

    @Test
    void percentileEmptyIsZero() {
        assertEquals(0L, PerformanceMonitor.percentile(List.of(), 95));
    }

    @Test
    void recordsAndSnapshotsAnOperation() {
        PerformanceMonitor m = new PerformanceMonitor();
        for (int i = 1; i <= 100; i++) {
            m.record("search", i);
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> stat = (Map<String, Object>) m.snapshot().get("search");
        assertEquals(100, stat.get("count"));
        assertEquals(100L, stat.get("max"));
        // p95 of 1..100 (nearest-rank) = 95, which is over the 500ms... no — 95 < 500, not over budget.
        assertFalse((Boolean) stat.get("overBudget"));
    }

    @Test
    void flagsOverBudgetOperation() {
        PerformanceMonitor m = new PerformanceMonitor();
        // work_item_create budget P95 = 300ms; record well above it.
        for (int i = 0; i < 50; i++) {
            m.record("work_item_create", 900);
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> stat = (Map<String, Object>) m.snapshot().get("work_item_create");
        assertTrue((Boolean) stat.get("overBudget"));
        assertEquals(300L, stat.get("budgetP95"));
    }
}
