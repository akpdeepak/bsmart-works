package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the business-hours arithmetic at the heart of the SLA engine. Uses a fixed
 * Mon–Fri 09:00–18:00 IST calendar so every assertion is deterministic.
 */
@Tag("unit")
class BusinessHoursCalculatorTest {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private final BusinessHoursCalculator calc = new BusinessHoursCalculator();

    /** Mon–Fri 09:00–18:00 (9 business hours/day), with optional holidays. */
    private BusinessHoursCalculator.Model weekdays(Set<LocalDate> holidays) {
        Map<DayOfWeek, List<BusinessHoursCalculator.TimeRange>> week = new EnumMap<>(DayOfWeek.class);
        var window = List.of(new BusinessHoursCalculator.TimeRange(LocalTime.of(9, 0), LocalTime.of(18, 0)));
        for (DayOfWeek d : List.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY, DayOfWeek.FRIDAY)) {
            week.put(d, window);
        }
        return new BusinessHoursCalculator.Model(IST, week, holidays);
    }

    private Instant ist(int year, int month, int day, int hour, int minute) {
        return ZonedDateTime.of(year, month, day, hour, minute, 0, 0, IST).toInstant();
    }

    @Test
    void dueAt_withinSameBusinessDay() {
        // Wed 2026-06-03 10:00 + 2h business → 12:00 same day.
        var model = weekdays(Set.of());
        Instant due = calc.dueAt(model, ist(2026, 6, 3, 10, 0), Duration.ofHours(2).getSeconds());
        assertEquals(ist(2026, 6, 3, 12, 0), due);
    }

    @Test
    void dueAt_rollsOverToNextBusinessDay() {
        // Wed 16:00 + 4h business: 2h left Wed (→18:00), 2h spill into Thu (09:00→11:00).
        var model = weekdays(Set.of());
        Instant due = calc.dueAt(model, ist(2026, 6, 3, 16, 0), Duration.ofHours(4).getSeconds());
        assertEquals(ist(2026, 6, 4, 11, 0), due);
    }

    @Test
    void dueAt_skipsWeekend() {
        // Fri 17:00 + 2h business: 1h Fri (→18:00), 1h Monday (09:00→10:00); Sat/Sun skipped.
        var model = weekdays(Set.of());
        Instant due = calc.dueAt(model, ist(2026, 6, 5, 17, 0), Duration.ofHours(2).getSeconds());
        assertEquals(ist(2026, 6, 8, 10, 0), due);
    }

    @Test
    void dueAt_startOutsideHoursClocksFromNextOpen() {
        // Wed 07:00 (before open) + 1h → clock starts 09:00, due 10:00.
        var model = weekdays(Set.of());
        Instant due = calc.dueAt(model, ist(2026, 6, 3, 7, 0), Duration.ofHours(1).getSeconds());
        assertEquals(ist(2026, 6, 3, 10, 0), due);
    }

    @Test
    void dueAt_skipsHoliday() {
        // Thu 2026-06-04 is a holiday: Wed 17:00 + 2h → 1h Wed, 1h Friday 09:00→10:00.
        var model = weekdays(Set.of(LocalDate.of(2026, 6, 4)));
        Instant due = calc.dueAt(model, ist(2026, 6, 3, 17, 0), Duration.ofHours(2).getSeconds());
        assertEquals(ist(2026, 6, 5, 10, 0), due);
    }

    @Test
    void dueAt_zeroTargetReturnsStart() {
        var model = weekdays(Set.of());
        Instant start = ist(2026, 6, 3, 10, 0);
        assertEquals(start, calc.dueAt(model, start, 0));
    }

    @Test
    void elapsed_withinWindowIsExact() {
        var model = weekdays(Set.of());
        long secs = calc.elapsedBusinessSeconds(model, ist(2026, 6, 3, 10, 0), ist(2026, 6, 3, 12, 30));
        assertEquals(Duration.ofHours(2).plusMinutes(30).getSeconds(), secs);
    }

    @Test
    void elapsed_clipsOutOfHoursTime() {
        // 17:00 Wed → 10:00 Thu spans an overnight gap: 1h Wed + 1h Thu = 2h business.
        var model = weekdays(Set.of());
        long secs = calc.elapsedBusinessSeconds(model, ist(2026, 6, 3, 17, 0), ist(2026, 6, 4, 10, 0));
        assertEquals(Duration.ofHours(2).getSeconds(), secs);
    }

    @Test
    void elapsed_weekendCountsZero() {
        // Sat 10:00 → Sat 16:00 is entirely non-working.
        var model = weekdays(Set.of());
        assertEquals(0, calc.elapsedBusinessSeconds(model, ist(2026, 6, 6, 10, 0), ist(2026, 6, 6, 16, 0)));
    }

    @Test
    void elapsed_reversedOrNullIsZero() {
        var model = weekdays(Set.of());
        assertEquals(0, calc.elapsedBusinessSeconds(model, ist(2026, 6, 3, 12, 0), ist(2026, 6, 3, 10, 0)));
        assertEquals(0, calc.elapsedBusinessSeconds(model, null, ist(2026, 6, 3, 10, 0)));
    }

    @Test
    void isWithinBusinessHours_reflectsWindow() {
        var model = weekdays(Set.of());
        assertTrue(calc.isWithinBusinessHours(model, ist(2026, 6, 3, 10, 0)));
        assertFalse(calc.isWithinBusinessHours(model, ist(2026, 6, 3, 20, 0)));
        assertFalse(calc.isWithinBusinessHours(model, ist(2026, 6, 6, 10, 0))); // Saturday
    }

    @Test
    void parse_buildsModelFromJson() {
        String week = "{\"MON\":{\"start\":\"09:00\",\"end\":\"17:00\"}}";
        var model = calc.parse("Asia/Kolkata", week, "[\"2026-06-04\"]");
        assertEquals(IST, model.zone());
        assertTrue(model.holidays().contains(LocalDate.of(2026, 6, 4)));
        // Monday is a 8h working day; a Monday 09:00 + 8h lands at 17:00.
        Instant mon = ist(2026, 6, 1, 9, 0); // 2026-06-01 is a Monday
        assertEquals(ist(2026, 6, 1, 17, 0), calc.dueAt(model, mon, Duration.ofHours(8).getSeconds()));
    }

    @Test
    void parse_malformedFallsBackToAlwaysOn() {
        var model = calc.parse("Not/AZone", "{not json", "nope");
        // Always-on: a full 24h target from any instant lands exactly 24h later (wall clock).
        Instant start = ist(2026, 6, 6, 10, 0); // a Saturday — still counts when always-on
        Instant due = calc.dueAt(model, start, Duration.ofHours(24).getSeconds());
        assertEquals(start.plus(Duration.ofHours(24)), due);
    }

    @Test
    void alwaysOn_treatsAllTimeAsBusinessTime() {
        var model = calc.alwaysOn(IST);
        long secs = calc.elapsedBusinessSeconds(model, ist(2026, 6, 6, 0, 0), ist(2026, 6, 7, 0, 0));
        assertEquals(Duration.ofHours(24).getSeconds(), secs);
    }
}
