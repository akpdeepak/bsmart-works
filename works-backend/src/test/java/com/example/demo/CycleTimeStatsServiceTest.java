package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@Tag("unit")
class CycleTimeStatsServiceTest {

    private final CycleTimeStatsService stats = new CycleTimeStatsService();

    @Test
    void percentile_emptyAndSingle() {
        assertThat(stats.percentile(List.of(), 85)).isZero();
        assertThat(stats.percentile(List.of(4.0), 85)).isEqualTo(4.0);
    }

    @Test
    void percentile_interpolatesMedianAndP85() {
        List<Double> v = List.of(1.0, 2.0, 3.0, 4.0, 5.0);
        assertThat(stats.percentile(v, 50)).isEqualTo(3.0);
        assertThat(stats.percentile(v, 85)).isCloseTo(4.4, within(0.001));
    }

    @Test
    void distribution_reportsMedianP85AndOutlierThreshold() {
        List<Double> v = List.of(1.0, 1.0, 2.0, 3.0, 30.0);
        CycleTimeStatsService.Distribution d = stats.distribution(v);
        assertThat(d.count()).isEqualTo(5);
        assertThat(d.median()).isEqualTo(2.0);
        assertThat(d.outlierThreshold()).isEqualTo(Math.round(d.p85() * 1.5 * 10.0) / 10.0);
    }

    @Test
    void histogram_bucketsByDays() {
        List<Double> v = List.of(0.5, 1.5, 25.0);
        List<Map<String, Object>> h = stats.histogram(v);
        assertThat(h).hasSize(CycleTimeStatsService.BUCKET_BOUNDS.length + 1);
        assertThat(h.get(0).get("label")).isEqualTo("<1d");
        assertThat(h.get(0).get("value")).isEqualTo(1);     // the 0.5d item
        assertThat(h.get(1).get("value")).isEqualTo(1);     // the 1.5d item (1-2d)
        assertThat(h.get(h.size() - 1).get("value")).isEqualTo(1); // the 25d item (21d+)
    }
}
