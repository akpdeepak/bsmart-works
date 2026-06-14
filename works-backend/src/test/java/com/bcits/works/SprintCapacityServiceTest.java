package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure-helper tests for the capacity derivation (RB-05 Stage 3). No database — these statics are the
 * whole arithmetic of the Capacity board, so they are exercised exhaustively here.
 */
@Tag("unit")
class SprintCapacityServiceTest {

    @Test
    void workingDaysBetween_countsWeekdaysInclusive() {
        // Mon 2026-06-01 .. Fri 2026-06-05 = 5 weekdays.
        assertThat(SprintCapacityService.workingDaysBetween(
            LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 5))).isEqualTo(5);
        // Mon 2026-06-01 .. Fri 2026-06-12 spans two weeks = 10 weekdays (weekend excluded).
        assertThat(SprintCapacityService.workingDaysBetween(
            LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 12))).isEqualTo(10);
        // Single weekday.
        assertThat(SprintCapacityService.workingDaysBetween(
            LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 1))).isEqualTo(1);
        // A weekend-only range counts 0.
        assertThat(SprintCapacityService.workingDaysBetween(
            LocalDate.of(2026, 6, 6), LocalDate.of(2026, 6, 7))).isZero();
    }

    @Test
    void workingDaysBetween_handlesNullAndInverted() {
        assertThat(SprintCapacityService.workingDaysBetween(null, LocalDate.of(2026, 6, 5))).isZero();
        assertThat(SprintCapacityService.workingDaysBetween(LocalDate.of(2026, 6, 5), null)).isZero();
        assertThat(SprintCapacityService.workingDaysBetween(
            LocalDate.of(2026, 6, 5), LocalDate.of(2026, 6, 1))).isZero();
    }

    @Test
    void effectiveWorkingDays_overrideWinsAndTimeOffSubtractsFlooredAtZero() {
        assertThat(SprintCapacityService.effectiveWorkingDays(null, 10, 0)).isEqualTo(10);
        assertThat(SprintCapacityService.effectiveWorkingDays(null, 10, 3)).isEqualTo(7);
        assertThat(SprintCapacityService.effectiveWorkingDays(8, 10, 2)).isEqualTo(6);  // override beats sprint days
        assertThat(SprintCapacityService.effectiveWorkingDays(null, 5, 20)).isZero();   // floor at 0
        assertThat(SprintCapacityService.effectiveWorkingDays(null, 10, -4)).isEqualTo(10); // negative time-off ignored
    }

    @Test
    void teamPointsPerDay_dividesVelocityAndGuardsZeroDenominator() {
        assertThat(SprintCapacityService.teamPointsPerDay(40, 10, 4)).isEqualTo(1.0);
        assertThat(SprintCapacityService.teamPointsPerDay(40, 0, 4)).isZero();
        assertThat(SprintCapacityService.teamPointsPerDay(40, 10, 0)).isZero();
    }

    @Test
    void capacityPoints_appliesFocusRoundsAndFloors() {
        // 8 days × 1.0 ppd × 80% = 6.4 → 6.
        assertThat(SprintCapacityService.capacityPoints(8, 1.0, 80)).isEqualTo(6);
        // 10 days × 1.0 ppd × 100% = 10.
        assertThat(SprintCapacityService.capacityPoints(10, 1.0, 100)).isEqualTo(10);
        // Zero focus → 0 budget.
        assertThat(SprintCapacityService.capacityPoints(10, 1.0, 0)).isZero();
    }

    @Test
    void utilizationPct_handlesZeroCapacitySentinel() {
        assertThat(SprintCapacityService.utilizationPct(15, 20)).isEqualTo(75);
        assertThat(SprintCapacityService.utilizationPct(0, 0)).isZero();
        assertThat(SprintCapacityService.utilizationPct(5, 0)).isEqualTo(SprintCapacityService.OVER_NO_CAPACITY);
    }

    @Test
    void capacityStatus_flagsOverUnderOk() {
        assertThat(SprintCapacityService.capacityStatus(21, 20)).isEqualTo("over");
        assertThat(SprintCapacityService.capacityStatus(10, 20)).isEqualTo("under"); // util 50 < 70
        assertThat(SprintCapacityService.capacityStatus(15, 20)).isEqualTo("ok");    // util 75
        assertThat(SprintCapacityService.capacityStatus(20, 20)).isEqualTo("ok");    // exactly full
        assertThat(SprintCapacityService.capacityStatus(3, 0)).isEqualTo("over");    // work, no capacity
    }

    @Test
    void clampFocus_defaultsAndClamps() {
        assertThat(SprintCapacityService.clampFocus(null)).isEqualTo(SprintCapacityService.DEFAULT_FOCUS_PCT);
        assertThat(SprintCapacityService.clampFocus(150)).isEqualTo(100);
        assertThat(SprintCapacityService.clampFocus(-5)).isZero();
        assertThat(SprintCapacityService.clampFocus(60)).isEqualTo(60);
    }

    @Test
    void flatSplit_evenlyDividesVelocityByHeadcount() {
        assertThat(SprintCapacityService.flatSplit(40, 4)).isEqualTo(10);
        assertThat(SprintCapacityService.flatSplit(10, 3)).isEqualTo(3); // round(3.33)
        assertThat(SprintCapacityService.flatSplit(40, 0)).isEqualTo(40); // guard divide-by-zero
    }
}
