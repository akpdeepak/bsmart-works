package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static com.example.demo.AiBudgetService.State;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link AiBudgetService} — the AI cost-discipline math (iteration 10, Cap Z;
 * RB-40 §2): 80% → degrade to Haiku, 100% → disable + serve fallbacks. Pure; no DB.
 */
@Tag("unit")
class AiBudgetServiceTest {

    private final AiBudgetService budget = new AiBudgetService();

    private BigDecimal d(String v) { return new BigDecimal(v); }

    @Test
    void consumedPercent_floorsAndClampsNegative() {
        assertThat(budget.consumedPercent(d("100"), d("50"))).isEqualTo(50);
        assertThat(budget.consumedPercent(d("100"), d("0"))).isZero();
        assertThat(budget.consumedPercent(d("100"), d("-10"))).isZero();
        assertThat(budget.consumedPercent(d("3"), d("2"))).isEqualTo(66); // floor of 66.6
    }

    @Test
    void consumedPercent_noCap_isZero() {
        assertThat(budget.consumedPercent(null, d("999"))).isZero();
        assertThat(budget.consumedPercent(d("0"), d("999"))).isZero();
    }

    @Test
    void state_crossesThresholdsAtEightyAndHundred() {
        assertThat(budget.state(d("100"), d("79"))).isEqualTo(State.NORMAL);
        assertThat(budget.state(d("100"), d("80"))).isEqualTo(State.DEGRADED);
        assertThat(budget.state(d("100"), d("99"))).isEqualTo(State.DEGRADED);
        assertThat(budget.state(d("100"), d("100"))).isEqualTo(State.DISABLED);
        assertThat(budget.state(d("100"), d("250"))).isEqualTo(State.DISABLED);
    }

    @Test
    void state_noCap_isNormal() {
        assertThat(budget.state(null, d("500"))).isEqualTo(State.NORMAL);
        assertThat(budget.state(d("0"), d("500"))).isEqualTo(State.NORMAL);
    }

    @Test
    void tierFor_selectsModelByState() {
        assertThat(budget.tierFor(State.NORMAL, "OPUS")).isEqualTo("OPUS");
        assertThat(budget.tierFor(State.NORMAL, null)).isEqualTo("SONNET");   // default capable tier
        assertThat(budget.tierFor(State.NORMAL, "  ")).isEqualTo("SONNET");
        assertThat(budget.tierFor(State.DEGRADED, "OPUS")).isEqualTo("HAIKU"); // forced cheap tier
        assertThat(budget.tierFor(State.DISABLED, "OPUS")).isEqualTo("DETERMINISTIC");
    }
}
