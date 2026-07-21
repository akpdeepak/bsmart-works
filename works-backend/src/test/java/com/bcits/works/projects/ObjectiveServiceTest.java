package com.bcits.works.projects;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class ObjectiveServiceTest {

    private final ObjectiveService service = new ObjectiveService(null, null, null, null, null);

    @Test
    void prepareNew_stampsIdDefaultsAndDates() {
        Objective o = new Objective();
        o.setTitle("Improve onboarding");
        o.setLevel(null);
        o.setStatus(null);
        service.prepareNew(o, "USR-9");
        assertThat(o.getId()).startsWith("OBJ-");
        assertThat(o.getCreatedBy()).isEqualTo("USR-9");
        assertThat(o.getLevel()).isEqualTo("TEAM");
        assertThat(o.getStatus()).isEqualTo("ON_TRACK");
        assertThat(o.getCreatedAt()).isNotNull();
        assertThat(o.getUpdatedAt()).isNotNull();
    }

    @Test
    void prepareNewKr_stampsIdObjectiveWorkspaceAndDefaults() {
        KeyResult kr = new KeyResult();
        kr.setTitle("Signup completion");
        kr.setMetricType(null);
        kr.setStatus(null);
        service.prepareNewKr(kr, "OBJ-1", "WS-1");
        assertThat(kr.getId()).startsWith("KR-");
        assertThat(kr.getObjectiveId()).isEqualTo("OBJ-1");
        assertThat(kr.getWorkspaceId()).isEqualTo("WS-1");
        assertThat(kr.getMetricType()).isEqualTo("PERCENT");
        assertThat(kr.getStatus()).isEqualTo("ON_TRACK");
        assertThat(kr.getCreatedAt()).isNotNull();
    }

    @Test
    void krProgress_percentScalesFromStartToTarget() {
        KeyResult kr = new KeyResult();
        kr.setMetricType("PERCENT");
        kr.setStartValue(0);
        kr.setTargetValue(100);
        kr.setCurrentValue(50);
        assertThat(KeyResultProgressProbe.progress(kr)).isEqualTo(50);
    }

    @Test
    void krProgress_clampsBelowZeroAndAboveHundred() {
        KeyResult below = new KeyResult();
        below.setMetricType("NUMBER");
        below.setStartValue(0);
        below.setTargetValue(100);
        below.setCurrentValue(-20);
        assertThat(KeyResultProgressProbe.progress(below)).isEqualTo(0);

        KeyResult above = new KeyResult();
        above.setMetricType("NUMBER");
        above.setStartValue(0);
        above.setTargetValue(100);
        above.setCurrentValue(150);
        assertThat(KeyResultProgressProbe.progress(above)).isEqualTo(100);
    }

    @Test
    void krProgress_booleanIsAllOrNothing() {
        KeyResult done = new KeyResult();
        done.setMetricType("BOOLEAN");
        done.setStartValue(0);
        done.setTargetValue(1);
        done.setCurrentValue(1);
        assertThat(KeyResultProgressProbe.progress(done)).isEqualTo(100);

        KeyResult notDone = new KeyResult();
        notDone.setMetricType("BOOLEAN");
        notDone.setStartValue(0);
        notDone.setTargetValue(1);
        notDone.setCurrentValue(0);
        assertThat(KeyResultProgressProbe.progress(notDone)).isEqualTo(0);
    }

    @Test
    void krProgress_divideByZeroGuardReturnsZero() {
        KeyResult kr = new KeyResult();
        kr.setMetricType("NUMBER");
        kr.setStartValue(50);
        kr.setTargetValue(50);
        kr.setCurrentValue(50);
        assertThat(KeyResultProgressProbe.progress(kr)).isEqualTo(0);
    }

    @Test
    void objectiveProgress_averagesKeyResultsAndIsZeroWhenEmpty() {
        assertThat(KeyResultProgressProbe.objective(List.of())).isEqualTo(0);

        KeyResult a = new KeyResult();
        a.setMetricType("PERCENT");
        a.setStartValue(0);
        a.setTargetValue(100);
        a.setCurrentValue(50);
        KeyResult b = new KeyResult();
        b.setMetricType("PERCENT");
        b.setStartValue(0);
        b.setTargetValue(100);
        b.setCurrentValue(100);
        assertThat(KeyResultProgressProbe.objective(List.of(a, b))).isEqualTo(75);
    }

    /** Exposes the package-private static helpers for assertion. */
    static final class KeyResultProgressProbe {
        static int progress(KeyResult kr) { return ObjectiveService.krProgress(kr); }
        static int objective(List<KeyResult> krs) { return ObjectiveService.objectiveProgress(krs); }
    }
}
