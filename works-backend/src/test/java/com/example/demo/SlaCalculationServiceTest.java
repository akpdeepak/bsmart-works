package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link SlaCalculationService} — the pure heart of the SLA engine (iteration 8,
 * Cap M). Business-hours arithmetic and the clock state-machine are deterministic and need no DB,
 * so every branch is exercised here. Dates use June 2026 where 2026-06-05 is a Friday and
 * 2026-06-08 the following Monday.
 */
@Tag("unit")
class SlaCalculationServiceTest {

    private final SlaCalculationService calc = new SlaCalculationService();

    /** Mon–Fri 09:00–18:00 in UTC, no holidays. */
    private SlaCalculationService.BusinessCalendar mwfCalendar() {
        String week = "{\"MON\":[[\"09:00\",\"18:00\"]],\"TUE\":[[\"09:00\",\"18:00\"]],"
            + "\"WED\":[[\"09:00\",\"18:00\"]],\"THU\":[[\"09:00\",\"18:00\"]],"
            + "\"FRI\":[[\"09:00\",\"18:00\"]]}";
        return calc.from("UTC", week, "[]");
    }

    private OffsetDateTime utc(String iso) {
        return OffsetDateTime.parse(iso + "Z");
    }

    // ── businessMinutesBetween ────────────────────────────────────────────────

    @Test
    void nullCalendar_countsEveryMinute() {
        long mins = calc.businessMinutesBetween(utc("2026-06-06T10:00:00"), utc("2026-06-06T12:30:00"), null);
        assertThat(mins).isEqualTo(150);
    }

    @Test
    void invertedOrEqualRange_isZero() {
        assertThat(calc.businessMinutesBetween(utc("2026-06-06T12:00:00"), utc("2026-06-06T10:00:00"), null))
            .isZero();
        assertThat(calc.businessMinutesBetween(utc("2026-06-06T12:00:00"), utc("2026-06-06T12:00:00"), null))
            .isZero();
    }

    @Test
    void businessCalendar_skipsWeekendAndOffHours() {
        // Friday 17:00 → Monday 10:00 = 1h Friday (17–18) + 1h Monday (9–10) = 120 business minutes.
        long mins = calc.businessMinutesBetween(
            utc("2026-06-05T17:00:00"), utc("2026-06-08T10:00:00"), mwfCalendar());
        assertThat(mins).isEqualTo(120);
    }

    @Test
    void businessCalendar_skipsHolidays() {
        // Monday 2026-06-08 is a holiday → the whole day is excluded.
        SlaCalculationService.BusinessCalendar cal =
            calc.from("UTC", "{\"MON\":[[\"09:00\",\"18:00\"]]}", "[\"2026-06-08\"]");
        long mins = calc.businessMinutesBetween(
            utc("2026-06-08T09:00:00"), utc("2026-06-08T18:00:00"), cal);
        assertThat(mins).isZero();
    }

    // ── addBusinessMinutes ─────────────────────────────────────────────────────

    @Test
    void nullCalendar_addsWallClockMinutes() {
        assertThat(calc.addBusinessMinutes(utc("2026-06-06T10:00:00"), 90, null))
            .isEqualTo(utc("2026-06-06T11:30:00"));
    }

    @Test
    void businessCalendar_rollsDeadlineOverTheWeekend() {
        // Friday 17:00 + 120 business minutes → 60 left after Friday's last hour → Monday 10:00.
        OffsetDateTime due = calc.addBusinessMinutes(utc("2026-06-05T17:00:00"), 120, mwfCalendar());
        assertThat(due.withOffsetSameInstant(ZoneOffset.UTC)).isEqualTo(utc("2026-06-08T10:00:00"));
    }

    @Test
    void businessCalendar_withinSingleWindow() {
        OffsetDateTime due = calc.addBusinessMinutes(utc("2026-06-08T10:00:00"), 60, mwfCalendar());
        assertThat(due.withOffsetSameInstant(ZoneOffset.UTC)).isEqualTo(utc("2026-06-08T11:00:00"));
    }

    // ── consumption + band ─────────────────────────────────────────────────────

    @Test
    void consumptionPercent_clampsAndHandlesZeroTarget() {
        assertThat(calc.consumptionPercent(50, 100)).isEqualTo(50);
        assertThat(calc.consumptionPercent(0, 100)).isZero();
        assertThat(calc.consumptionPercent(150, 100)).isEqualTo(150);
        assertThat(calc.consumptionPercent(-5, 100)).isZero();
        assertThat(calc.consumptionPercent(5, 0)).isEqualTo(100);
    }

    @Test
    void band_reflectsRemainingBudget() {
        assertThat(calc.band(10, 100)).isEqualTo("OK");
        assertThat(calc.band(60, 100)).isEqualTo("WARN");
        assertThat(calc.band(100, 100)).isEqualTo("BREACH");
    }

    // ── advance (clock state machine) ───────────────────────────────────────────

    @Test
    void advance_terminalStatesPassThrough() {
        var s = calc.advance("MET", 30, null, 100, "Done", Set.of(), "Done", null, utc("2026-06-06T10:00:00"));
        assertThat(s.state()).isEqualTo("MET");
        assertThat(s.metNow()).isFalse();
    }

    @Test
    void advance_runningWithinBudget_staysRunning() {
        OffsetDateTime now = utc("2026-06-06T10:30:00");
        var s = calc.advance("RUNNING", 0, utc("2026-06-06T10:00:00"), 100, "In Progress",
            Set.of("Waiting"), "Done", null, now);
        assertThat(s.state()).isEqualTo("RUNNING");
        assertThat(s.breachedNow()).isFalse();
    }

    @Test
    void advance_runningOverBudget_breaches() {
        OffsetDateTime now = utc("2026-06-06T12:00:00"); // 120 wall minutes since resume
        var s = calc.advance("RUNNING", 0, utc("2026-06-06T10:00:00"), 60, "In Progress",
            Set.of(), "Done", null, now);
        assertThat(s.state()).isEqualTo("BREACHED");
        assertThat(s.breachedNow()).isTrue();
        assertThat(s.elapsedMinutes()).isEqualTo(120);
    }

    @Test
    void advance_pauseStatus_freezesClockAtLiveElapsed() {
        OffsetDateTime now = utc("2026-06-06T10:30:00"); // 30 wall minutes accrued
        var s = calc.advance("RUNNING", 0, utc("2026-06-06T10:00:00"), 100, "Waiting on customer",
            Set.of("Waiting on customer"), "Done", null, now);
        assertThat(s.state()).isEqualTo("PAUSED");
        assertThat(s.pausedNow()).isTrue();
        assertThat(s.elapsedMinutes()).isEqualTo(30);
    }

    @Test
    void advance_resumesFromPause() {
        var s = calc.advance("PAUSED", 30, null, 100, "In Progress",
            Set.of("Waiting on customer"), "Done", null, utc("2026-06-06T11:00:00"));
        assertThat(s.state()).isEqualTo("RUNNING");
        assertThat(s.resumedNow()).isTrue();
        assertThat(s.elapsedMinutes()).isEqualTo(30); // banked elapsed preserved
    }

    @Test
    void advance_reachingStopWithinBudget_isMet() {
        OffsetDateTime now = utc("2026-06-06T10:30:00");
        var s = calc.advance("RUNNING", 0, utc("2026-06-06T10:00:00"), 100, "Done",
            Set.of(), "Done", null, now);
        assertThat(s.state()).isEqualTo("MET");
        assertThat(s.metNow()).isTrue();
    }

    @Test
    void advance_reachingStopOverBudget_isBreached() {
        OffsetDateTime now = utc("2026-06-06T12:00:00");
        var s = calc.advance("RUNNING", 0, utc("2026-06-06T10:00:00"), 60, "Done",
            Set.of(), "Done", null, now);
        assertThat(s.state()).isEqualTo("BREACHED");
        assertThat(s.breachedNow()).isTrue();
    }
}
