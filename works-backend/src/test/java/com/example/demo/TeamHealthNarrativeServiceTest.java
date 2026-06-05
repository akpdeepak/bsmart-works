package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class TeamHealthNarrativeServiceTest {

    private final TeamHealthNarrativeService narrative = new TeamHealthNarrativeService();

    private TeamHealthService.TeamHealth health(double p, double s, double f, double composite, String band) {
        return new TeamHealthService.TeamHealth(p, s, f, composite, band);
    }

    @Test
    void generate_isDeterministicFallback_andStatesOverallHealth() {
        TeamHealthService.TeamHealth current = health(82, 68, 70, 73.3, "WATCH");
        TeamHealthNarrativeService.Narrative n = narrative.generate(current, null, 0);
        assertThat(n.source()).isEqualTo("deterministic"); // the mandatory AI fallback (RB-40 §2)
        assertThat(n.summary()).contains("worth watching").contains("73.3%");
        assertThat(n.highlights()).isNotEmpty();
    }

    @Test
    void generate_describesDeltasAndAttributesScopeDeclineToMidSprintAdditions() {
        TeamHealthService.TeamHealth prev = health(70, 80, 70, 73.3, "WATCH");
        TeamHealthService.TeamHealth current = health(82, 68, 70, 73.3, "WATCH");
        TeamHealthNarrativeService.Narrative n = narrative.generate(current, prev, 3);
        assertThat(n.summary()).contains("Predictability improved");
        assertThat(n.summary()).contains("Scope stability declined");
        assertThat(n.summary()).contains("3 mid-sprint additions");
    }

    @Test
    void generate_ignoresImmaterialDeltas() {
        TeamHealthService.TeamHealth prev = health(80, 80, 80, 80, "HEALTHY");
        TeamHealthService.TeamHealth current = health(81, 79, 80.5, 80.2, "HEALTHY");
        TeamHealthNarrativeService.Narrative n = narrative.generate(current, prev, 0);
        // Sub-3-point moves are not called out; with none material, a steady-state highlight appears.
        assertThat(n.summary()).contains("steady");
    }
}
