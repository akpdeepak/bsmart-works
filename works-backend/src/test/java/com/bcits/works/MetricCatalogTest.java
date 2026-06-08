package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The default KPI catalog (iteration 12, Cap L). Confirms the reasonable-default metric set and the
 * private-vs-aggregate split that the privacy model relies on (RB-40 §1).
 */
@Tag("unit")
class MetricCatalogTest {

    @Test
    void catalog_hasTheDefaultMetrics() {
        assertThat(MetricCatalog.all()).hasSizeGreaterThanOrEqualTo(9);
        assertThat(MetricCatalog.isKnown(MetricCatalog.VELOCITY)).isTrue();
        assertThat(MetricCatalog.isKnown("nope")).isFalse();
        assertThat(MetricCatalog.get(MetricCatalog.CYCLE_TIME).higherIsBetter()).isFalse();
        assertThat(MetricCatalog.get(MetricCatalog.VELOCITY).higherIsBetter()).isTrue();
    }

    @Test
    void personalMetrics_areIndividualAndPrivate() {
        assertThat(MetricCatalog.personalMetrics())
            .isNotEmpty()
            .allMatch(MetricCatalog.Metric::privateByDefault)
            .allMatch(m -> "INDIVIDUAL".equals(m.scopeLevel()));
    }

    @Test
    void aggregateMetrics_areNeverPrivate() {
        assertThat(MetricCatalog.aggregateMetrics())
            .isNotEmpty()
            .noneMatch(MetricCatalog.Metric::privateByDefault);
    }
}
