package com.bcits.works.security;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Heuristic access-anomaly detection (iteration 19 Cap T, RB-40 §4 — the deterministic fallback). */
@Tag("unit")
class AnomalyDetectorTest {

    private AnomalyDetector.AccessSignal signal(String country, Set<String> usual, int hour,
                                                int exported, int norm, boolean escalated,
                                                Integer minsSincePrev, boolean diffCountry) {
        return new AnomalyDetector.AccessSignal("USR-2", country, usual, hour, exported, norm,
                escalated, minsSincePrev, diffCountry);
    }

    private boolean has(List<AnomalyDetector.Finding> f, String type) {
        return f.stream().anyMatch(x -> x.type().equals(type));
    }

    @Test
    void normalAccessProducesNoFindings() {
        List<AnomalyDetector.Finding> f = AnomalyDetector.detect(
                signal("IN", Set.of("IN"), 14, 5, 60, false, null, false));
        assertThat(f).isEmpty();
    }

    @Test
    void newGeographyIsFlagged() {
        List<AnomalyDetector.Finding> f = AnomalyDetector.detect(
                signal("SG", Set.of("IN"), 14, 0, 60, false, null, false));
        assertThat(has(f, "NEW_GEO")).isTrue();
    }

    @Test
    void newGeographyAtNightIsHighSeverity() {
        List<AnomalyDetector.Finding> f = AnomalyDetector.detect(
                signal("SG", Set.of("IN"), 3, 0, 60, false, null, false));
        assertThat(f).filteredOn(x -> x.type().equals("NEW_GEO"))
                .allMatch(x -> x.severity().equals("HIGH"));
    }

    @Test
    void massExportIsFlaggedAboveFiveTimesNorm() {
        List<AnomalyDetector.Finding> f = AnomalyDetector.detect(
                signal("IN", Set.of("IN"), 14, 1240, 68, false, null, false));
        assertThat(has(f, "MASS_EXPORT")).isTrue();
    }

    @Test
    void smallExportIsNotFlagged() {
        List<AnomalyDetector.Finding> f = AnomalyDetector.detect(
                signal("IN", Set.of("IN"), 14, 50, 68, false, null, false));
        assertThat(has(f, "MASS_EXPORT")).isFalse();
    }

    @Test
    void privilegeEscalationIsFlagged() {
        List<AnomalyDetector.Finding> f = AnomalyDetector.detect(
                signal("IN", Set.of("IN"), 14, 0, 60, true, null, false));
        assertThat(has(f, "PERMISSION_ESCALATION")).isTrue();
    }

    @Test
    void impossibleTravelIsFlagged() {
        List<AnomalyDetector.Finding> f = AnomalyDetector.detect(
                signal("US", Set.of("US"), 14, 0, 60, false, 30, true));
        assertThat(has(f, "IMPOSSIBLE_TRAVEL")).isTrue();
    }

    @Test
    void offHoursOnlyWhenNotAlreadyNewGeo() {
        // Off-hours but same country → OFF_HOURS_ACCESS appears.
        List<AnomalyDetector.Finding> sameCountry = AnomalyDetector.detect(
                signal("IN", Set.of("IN"), 3, 0, 60, false, null, false));
        assertThat(has(sameCountry, "OFF_HOURS_ACCESS")).isTrue();

        // Off-hours AND new geo → the NEW_GEO finding supersedes a standalone off-hours one.
        List<AnomalyDetector.Finding> newGeo = AnomalyDetector.detect(
                signal("SG", Set.of("IN"), 3, 0, 60, false, null, false));
        assertThat(has(newGeo, "OFF_HOURS_ACCESS")).isFalse();
        assertThat(has(newGeo, "NEW_GEO")).isTrue();
    }

    @Test
    void nullSignalIsSafe() {
        assertThat(AnomalyDetector.detect(null)).isEmpty();
    }
}
