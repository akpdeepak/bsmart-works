package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class TeamHealthServiceTest {

    private final TeamHealthService health = new TeamHealthService();

    @Test
    void predictability_meanOfAccuracies_clamped() {
        assertThat(health.predictability(List.of(80.0, 90.0, 100.0))).isEqualTo(90.0);
        assertThat(health.predictability(List.of())).isZero();
        assertThat(health.predictability(List.of(150.0))).isEqualTo(100.0); // clamped
    }

    @Test
    void scopeStability_noCommitmentIsStable_growthErodesIt() {
        assertThat(health.scopeStability(0, 0)).isEqualTo(100.0);
        assertThat(health.scopeStability(100, 0)).isEqualTo(100.0);
        assertThat(health.scopeStability(100, 25)).isEqualTo(75.0);
        assertThat(health.scopeStability(100, 200)).isZero(); // clamped at 0
    }

    @Test
    void flowEfficiency_activeOverTotal() {
        assertThat(health.flowEfficiency(0, 0)).isZero();
        assertThat(health.flowEfficiency(50, 100)).isEqualTo(50.0);
        assertThat(health.flowEfficiency(200, 100)).isEqualTo(100.0); // clamped
    }

    @Test
    void band_thresholds() {
        assertThat(health.band(85)).isEqualTo("HEALTHY");
        assertThat(health.band(80)).isEqualTo("HEALTHY");
        assertThat(health.band(70)).isEqualTo("WATCH");
        assertThat(health.band(64)).isEqualTo("AT_RISK");
    }

    @Test
    void compose_equalWeightedCompositeWithBand() {
        TeamHealthService.TeamHealth h = health.compose(90, 60, 90);
        assertThat(h.composite()).isEqualTo(80.0);
        assertThat(h.band()).isEqualTo("HEALTHY");
        assertThat(h.predictability()).isEqualTo(90.0);
        assertThat(h.scopeStability()).isEqualTo(60.0);
    }
}
