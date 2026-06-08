package com.bcits.works;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The pure heart of the SLA engine (iteration 8, Cap M): business-time arithmetic. Given a
 * {@link BusinessCalendar} it answers two questions deterministically — "how many business minutes
 * elapsed between two instants?" and "where does the deadline land if I add N business minutes?".
 * A null calendar means 24x7 (every minute counts), which is the graceful default.
 *
 * <p>No I/O and no Spring collaborators, so every branch is unit-testable in isolation (mirrors
 * {@link StatusDurationService}'s pure {@code compute}). The clock scheduler and evaluation service
 * are thin wrappers that load data and call into here.
 */
@Service
public class SlaCalculationService {

    /** Hard ceiling on the forward walk so a calendar with no working time can never loop forever. */
    private static final int MAX_FORWARD_DAYS = 366 * 5;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** A single working window within a day, in local time; {@code end} is exclusive. */
    public record Window(LocalTime start, LocalTime end) { }

    /**
     * Parsed, immutable working calendar: a timezone, per-weekday windows, and a holiday set.
     * Build it from the stored JSON via {@link #from(String, String, String)}.
     */
    public static final class BusinessCalendar {
        private final ZoneId zone;
        private final Map<DayOfWeek, List<Window>> windows;
        private final Set<LocalDate> holidays;

        BusinessCalendar(ZoneId zone, Map<DayOfWeek, List<Window>> windows, Set<LocalDate> holidays) {
            this.zone = zone;
            this.windows = windows;
            this.holidays = holidays;
        }

        List<Window> windowsOn(LocalDate date) {
            if (holidays.contains(date)) {
                return List.of();
            }
            return windows.getOrDefault(date.getDayOfWeek(), List.of());
        }
    }

    /**
     * Build a calendar from its stored representation. {@code workWeekJson} is an object keyed by
     * three-letter weekday (MON…SUN) whose values are arrays of {@code ["HH:mm","HH:mm"]} pairs;
     * {@code holidaysJson} is an array of ISO dates. Malformed entries are skipped defensively — a
     * bad calendar degrades to "fewer working windows", never an exception into the engine.
     */
    public BusinessCalendar from(String timezone, String workWeekJson, String holidaysJson) {
        ZoneId zone;
        try {
            zone = ZoneId.of(timezone == null || timezone.isBlank() ? "UTC" : timezone.trim());
        } catch (RuntimeException ex) {
            zone = ZoneId.of("UTC");
        }
        Map<DayOfWeek, List<Window>> windows = new EnumMap<>(DayOfWeek.class);
        try {
            JsonNode root = MAPPER.readTree(workWeekJson == null || workWeekJson.isBlank() ? "{}" : workWeekJson);
            Iterator<String> names = root.fieldNames();
            while (names.hasNext()) {
                String key = names.next();
                DayOfWeek day = parseDay(key);
                if (day == null) {
                    continue;
                }
                List<Window> dayWindows = new ArrayList<>();
                for (JsonNode pair : root.get(key)) {
                    if (pair.isArray() && pair.size() == 2) {
                        LocalTime s = parseTime(pair.get(0).asText());
                        LocalTime e = parseTime(pair.get(1).asText());
                        if (s != null && e != null && e.isAfter(s)) {
                            dayWindows.add(new Window(s, e));
                        }
                    }
                }
                if (!dayWindows.isEmpty()) {
                    windows.put(day, dayWindows);
                }
            }
        } catch (RuntimeException | com.fasterxml.jackson.core.JsonProcessingException ex) {
            // Malformed calendar → treated as no working windows (caller can fall back to 24x7 policy).
            windows.clear();
        }
        Set<LocalDate> holidays = new HashSet<>();
        try {
            JsonNode arr = MAPPER.readTree(holidaysJson == null || holidaysJson.isBlank() ? "[]" : holidaysJson);
            for (JsonNode d : arr) {
                try {
                    holidays.add(LocalDate.parse(d.asText()));
                } catch (RuntimeException ignored) {
                    // skip a single malformed date, keep the rest
                }
            }
        } catch (com.fasterxml.jackson.core.JsonProcessingException ignored) {
            // no holidays
        }
        return new BusinessCalendar(zone, windows, holidays);
    }

    /**
     * Business minutes elapsed in {@code (from, to]}. With a null calendar every minute counts
     * (24x7). Never negative — an inverted or equal range is zero.
     */
    public long businessMinutesBetween(OffsetDateTime from, OffsetDateTime to, BusinessCalendar cal) {
        if (from == null || to == null || !to.isAfter(from)) {
            return 0;
        }
        if (cal == null) {
            return ChronoUnit.MINUTES.between(from, to);
        }
        ZonedDateTime start = from.atZoneSameInstant(cal.zone);
        ZonedDateTime end = to.atZoneSameInstant(cal.zone);
        long total = 0;
        for (LocalDate date = start.toLocalDate(); !date.isAfter(end.toLocalDate()); date = date.plusDays(1)) {
            for (Window w : cal.windowsOn(date)) {
                ZonedDateTime ws = date.atTime(w.start()).atZone(cal.zone);
                ZonedDateTime we = date.atTime(w.end()).atZone(cal.zone);
                ZonedDateTime lo = ws.isBefore(start) ? start : ws;
                ZonedDateTime hi = we.isAfter(end) ? end : we;
                if (hi.isAfter(lo)) {
                    total += ChronoUnit.MINUTES.between(lo, hi);
                }
            }
        }
        return total;
    }

    /**
     * The wall-clock instant reached by adding {@code minutes} of business time to {@code from}.
     * With a null calendar this is simple wall-clock addition. With a calendar, the budget is
     * consumed window by window; if the calendar has no working time within the safety horizon the
     * deadline falls back to plain wall-clock addition so a clock always has a finite due time.
     */
    public OffsetDateTime addBusinessMinutes(OffsetDateTime from, long minutes, BusinessCalendar cal) {
        if (from == null) {
            return null;
        }
        if (cal == null || minutes <= 0) {
            return from.plusMinutes(Math.max(0, minutes));
        }
        ZonedDateTime cursor = from.atZoneSameInstant(cal.zone);
        long remaining = minutes;
        LocalDate date = cursor.toLocalDate();
        for (int guard = 0; guard <= MAX_FORWARD_DAYS; guard++, date = date.plusDays(1)) {
            for (Window w : cal.windowsOn(date)) {
                ZonedDateTime ws = date.atTime(w.start()).atZone(cal.zone);
                ZonedDateTime we = date.atTime(w.end()).atZone(cal.zone);
                ZonedDateTime windowStart = ws.isBefore(cursor) ? cursor : ws;
                if (!we.isAfter(windowStart)) {
                    continue;
                }
                long available = ChronoUnit.MINUTES.between(windowStart, we);
                if (remaining <= available) {
                    return windowStart.plusMinutes(remaining).toOffsetDateTime();
                }
                remaining -= available;
            }
        }
        // No working time within the horizon — degrade to wall-clock so the deadline is still finite.
        return from.plusMinutes(minutes);
    }

    /** Consumed percentage of the budget, floored at 0. {@code targetMinutes <= 0} reads as 100%. */
    public int consumptionPercent(int elapsedMinutes, int targetMinutes) {
        if (targetMinutes <= 0) {
            return 100;
        }
        return (int) Math.floor((Math.max(0, elapsedMinutes) * 100.0) / targetMinutes);
    }

    /**
     * Display band for a clock, used by the visible countdown badge:
     * {@code OK} (&gt;50% remaining), {@code WARN} (&le;50% remaining), {@code BREACH} (consumed).
     */
    public String band(int elapsedMinutes, int targetMinutes) {
        int pct = consumptionPercent(elapsedMinutes, targetMinutes);
        if (pct >= 100) {
            return "BREACH";
        }
        return pct >= 50 ? "WARN" : "OK";
    }

    /**
     * The outcome of advancing a clock one step: its new state, the elapsed business minutes to
     * persist, and one-shot transition flags the caller turns into events/notifications.
     */
    public record ClockState(String state, int elapsedMinutes,
                             boolean metNow, boolean breachedNow, boolean pausedNow, boolean resumedNow) { }

    /**
     * Pure clock state-machine (the testable core of evaluation). Given a clock's banked elapsed
     * minutes and the work item's current status, decide the next state. {@code RUNNING} accrues
     * business time since {@code lastResumedAt}; a pause status freezes it; the stop status settles
     * it (MET within budget, else BREACHED); overrunning the budget while running breaches it.
     * MET/BREACHED/STOPPED are terminal and pass through unchanged.
     */
    public ClockState advance(String currentState, int bankedElapsed, OffsetDateTime lastResumedAt,
                              int targetMinutes, String status, Set<String> pauseStatuses,
                              String stopStatus, BusinessCalendar cal, OffsetDateTime now) {
        if ("MET".equals(currentState) || "BREACHED".equals(currentState) || "STOPPED".equals(currentState)) {
            return new ClockState(currentState, bankedElapsed, false, false, false, false);
        }
        boolean running = "RUNNING".equals(currentState);
        int live = bankedElapsed
            + (running ? (int) businessMinutesBetween(lastResumedAt, now, cal) : 0);

        if (stopStatus != null && stopStatus.equalsIgnoreCase(status)) {
            boolean breached = live > targetMinutes;
            return new ClockState(breached ? "BREACHED" : "MET", live, !breached, breached, false, false);
        }
        Set<String> pauses = pauseStatuses == null ? Set.of() : pauseStatuses;
        boolean shouldPause = status != null && pauses.stream().anyMatch(status::equalsIgnoreCase);

        if (shouldPause) {
            return running
                ? new ClockState("PAUSED", live, false, false, true, false)
                : new ClockState("PAUSED", bankedElapsed, false, false, false, false);
        }
        // Active status: resume if we were paused, otherwise keep running (and breach on overrun).
        if (!running) {
            return new ClockState("RUNNING", bankedElapsed, false, false, false, true);
        }
        if (live >= targetMinutes) {
            return new ClockState("BREACHED", live, false, true, false, false);
        }
        return new ClockState("RUNNING", bankedElapsed, false, false, false, false);
    }

    private static DayOfWeek parseDay(String key) {
        if (key == null) {
            return null;
        }
        return switch (key.trim().toUpperCase()) {
            case "MON", "MONDAY" -> DayOfWeek.MONDAY;
            case "TUE", "TUESDAY" -> DayOfWeek.TUESDAY;
            case "WED", "WEDNESDAY" -> DayOfWeek.WEDNESDAY;
            case "THU", "THURSDAY" -> DayOfWeek.THURSDAY;
            case "FRI", "FRIDAY" -> DayOfWeek.FRIDAY;
            case "SAT", "SATURDAY" -> DayOfWeek.SATURDAY;
            case "SUN", "SUNDAY" -> DayOfWeek.SUNDAY;
            default -> null;
        };
    }

    private static LocalTime parseTime(String hhmm) {
        try {
            return LocalTime.parse(hhmm.trim());
        } catch (RuntimeException ex) {
            return null;
        }
    }
}
