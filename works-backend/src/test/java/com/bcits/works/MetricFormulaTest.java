package com.bcits.works;

import com.bcits.works.shared.ApiException;
import com.bcits.works.reporting.MetricFormula;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The safe formula builder (iteration 12, Cap L). Covers the aggregate primitives and — critically —
 * the privacy guardrail that a custom metric can never target the INDIVIDUAL scope (RB-40 §1).
 */
@Tag("unit")
class MetricFormulaTest {

    @Test
    void primitives_computeAsExpected() {
        List<Double> v = List.of(2.0, 4.0, 6.0, 8.0);
        assertThat(MetricFormula.sum(v)).isEqualTo(20.0);
        assertThat(MetricFormula.avg(v)).isEqualTo(5.0);
        assertThat(MetricFormula.count(v)).isEqualTo(4);
        assertThat(MetricFormula.median(v)).isEqualTo(4.0);      // nearest-rank P50
        assertThat(MetricFormula.percentile(v, 100)).isEqualTo(8.0);
    }

    @Test
    void aggregates_handleNullsAndEmpty() {
        assertThat(MetricFormula.sum(null)).isZero();
        assertThat(MetricFormula.avg(List.of())).isZero();
        assertThat(MetricFormula.percentile(List.of(), 85)).isZero();
        assertThat(MetricFormula.avg(Arrays.asList(2.0, null, 4.0))).isEqualTo(3.0);
    }

    @Test
    void ratio_isPercentAndGuardsZeroDenominator() {
        assertThat(MetricFormula.ratio(3, 4)).isEqualTo(75.0);
        assertThat(MetricFormula.ratio(5, 0)).isZero();
    }

    @Test
    void validateDefinition_acceptsAggregateScopes() {
        MetricFormula.validateDefinition("AVG", "TEAM");
        MetricFormula.validateDefinition("sum", "project");
        MetricFormula.validateDefinition("RATIO", "ORG");
    }

    @Test
    void validateDefinition_rejectsIndividualScope() {
        assertThatThrownBy(() -> MetricFormula.validateDefinition("AVG", "INDIVIDUAL"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo("INVALID_SCOPE"));
    }

    @Test
    void validateDefinition_rejectsUnknownPrimitive() {
        assertThatThrownBy(() -> MetricFormula.validateDefinition("DROP TABLE", "TEAM"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo("INVALID_PRIMITIVE"));
    }

    @Test
    void normalizers_fallBackSafely() {
        assertThat(MetricFormula.normalizePrimitive("weird")).isEqualTo("AVG");
        assertThat(MetricFormula.normalizeScope("weird")).isEqualTo("TEAM");
        assertThat(MetricFormula.normalizeScope("individual")).isEqualTo("INDIVIDUAL");
    }
}
