package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("unit")
class MetricFormulaServiceTest {

    private final MetricFormulaService formula = new MetricFormulaService();

    @Test
    void normalizers_coerceUnknownValuesToSafeDefaults() {
        assertThat(formula.normalizeAggregation("avg")).isEqualTo("AVG");
        assertThat(formula.normalizeAggregation("bogus")).isEqualTo("AVG");
        assertThat(formula.normalizeCategory("quality")).isEqualTo("QUALITY");
        assertThat(formula.normalizeCategory(null)).isEqualTo("FLOW");
        assertThat(formula.normalizeUnit("DAYS")).isEqualTo("days");
        assertThat(formula.normalizeUnit("furlongs")).isEqualTo("count");
        assertThat(formula.normalizeMinLayer("personal")).isEqualTo("PERSONAL");
        assertThat(formula.normalizeMinLayer("org")).isEqualTo("TEAM"); // only PERSONAL/TEAM allowed
    }

    @Test
    void validate_rejectsBlankKeyAndBadKeyShape() {
        assertThatThrownBy(() -> formula.validate(def(null, "x", "AVG", null)))
            .isInstanceOf(ApiException.class).hasMessageContaining("key");
        assertThatThrownBy(() -> formula.validate(def("Bad Key", "x", "AVG", null)))
            .isInstanceOf(ApiException.class).hasMessageContaining("lower_snake_case");
    }

    @Test
    void validate_requiresSource() {
        assertThatThrownBy(() -> formula.validate(def("my_metric", null, "COUNT", null)))
            .isInstanceOf(ApiException.class).hasMessageContaining("source");
    }

    @Test
    void validate_percentileMetricNeedsValidPercentile() {
        assertThatThrownBy(() -> formula.validate(def("p_metric", "cycle_time", "PERCENTILE", null)))
            .isInstanceOf(ApiException.class).hasMessageContaining("percentile");
        assertThatThrownBy(() -> formula.validate(def("p_metric", "cycle_time", "PERCENTILE", 0)))
            .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> formula.validate(def("p_metric", "cycle_time", "PERCENTILE", 100)))
            .isInstanceOf(ApiException.class);
        formula.validate(def("p_metric", "cycle_time", "PERCENTILE", 85)); // valid
    }

    @Test
    void prepareNew_stampsIdNormalizesAndForcesNonDefault() {
        MetricDefinition d = def("My_Metric", "throughput", "count", null);
        MetricDefinition out = formula.prepareNew(d, "WS-1", "USR-1");
        assertThat(out.getId()).startsWith("MD-");
        assertThat(out.getWorkspaceId()).isEqualTo("WS-1");
        assertThat(out.getMetricKey()).isEqualTo("my_metric"); // lower-cased
        assertThat(out.getAggregation()).isEqualTo("COUNT");
        assertThat(out.getIsDefault()).isFalse();              // user metrics are never default-catalog
        assertThat(out.getCreatedAt()).isNotNull();
    }

    private MetricDefinition def(String key, String source, String agg, Integer percentile) {
        MetricDefinition d = new MetricDefinition();
        d.setMetricKey(key);
        d.setSource(source);
        d.setAggregation(agg);
        d.setPercentile(percentile);
        return d;
    }
}
