package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The heart of the SLA engine: business-hours arithmetic. Given a calendar (timezone +
 * weekly working windows + holidays), it answers two questions purely (no I/O, so it is
 * unit-testable in isolation, mirroring {@link ComplianceRuleService}):
 *
 * <ul>
 *   <li>{@link #dueAt} — when will {@code targetSeconds} of business-time be exhausted,
 *       starting from an instant? Time outside windows, on weekends, or on holidays does
 *       not count, so an SLA "pauses" automatically outside business hours.</li>
 *   <li>{@link #elapsedBusinessSeconds} — how much business-time elapsed between two
 *       instants?</li>
 * </ul>
 *
 * All boundary maths is done with {@link ZonedDateTime}/{@link Instant} so it stays correct
 * across DST transitions.
 */
@Service
public class BusinessHoursCalculator {

    /** A working window within a single day, in the calendar's local time. */
    public record TimeRange(LocalTime start, LocalTime end) { }

    /** A fully-parsed calendar ready for arithmetic. */
    public record Model(ZoneId zone, Map<DayOfWeek, List<TimeRange>> week, Set<LocalDate> holidays) { }

    private static final int MAX_DAYS = 3660; // ~10 business years — guards against bad input
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** A 24×7 fallback model: business-time equals wall-clock time. Used when no calendar is set. */
    public Model alwaysOn(ZoneId zone) {
        Map<DayOfWeek, List<TimeRange>> week = new EnumMap<>(DayOfWeek.class);
        List<TimeRange> allDay = List.of(new TimeRange(LocalTime.MIN, LocalTime.MAX));
        for (DayOfWeek d : DayOfWeek.values()) {
            week.put(d, allDay);
        }
        return new Model(zone, week, Set.of());
    }

    /**
     * Parse a calendar entity's JSON columns into a {@link Model}. Unparseable input falls
     * back to an always-on model so a malformed calendar can never break a work-item write.
     */
    public Model parse(String timezone, String workWeekJson, String holidaysJson) {
        ZoneId zone;
        try {
            zone = ZoneId.of(timezone == null || timezone.isBlank() ? "Asia/Kolkata" : timezone);
        } catch (Exception e) {
            zone = ZoneId.of("Asia/Kolkata");
        }
        Map<DayOfWeek, List<TimeRange>> week = new EnumMap<>(DayOfWeek.class);
        try {
            JsonNode root = objectMapper.readTree(workWeekJson == null || workWeekJson.isBlank() ? "{}" : workWeekJson);
            for (DayOfWeek day : DayOfWeek.values()) {
                JsonNode node = root.get(day.name().substring(0, 3)); // MON, TUE, …
                if (node != null && node.hasNonNull("start") && node.hasNonNull("end")) {
                    LocalTime s = LocalTime.parse(node.get("start").asText());
                    LocalTime e = LocalTime.parse(node.get("end").asText());
                    if (e.isAfter(s)) {
                        week.put(day, List.of(new TimeRange(s, e)));
                    }
                }
            }
        } catch (Exception e) {
            return alwaysOn(zone);
        }
        Set<LocalDate> holidays = new HashSet<>();
        try {
            JsonNode arr = objectMapper.readTree(holidaysJson == null || holidaysJson.isBlank() ? "[]" : holidaysJson);
            if (arr.isArray()) {
                for (Iterator<JsonNode> it = arr.elements(); it.hasNext(); ) {
                    holidays.add(LocalDate.parse(it.next().asText()));
                }
            }
        } catch (Exception ignored) {
            // a bad holiday list just means no holidays — never fatal
        }
        // An empty week would make every SLA un-meetable; treat it as always-on.
        return week.isEmpty() ? alwaysOn(zone) : new Model(zone, week, holidays);
    }

    private List<TimeRange> windowsFor(Model m, LocalDate date) {
        if (m.holidays().contains(date)) {
            return List.of();
        }
        return m.week().getOrDefault(date.getDayOfWeek(), List.of());
    }

    private Instant winOpen(Model m, LocalDate date, TimeRange w) {
        return ZonedDateTime.of(date, w.start(), m.zone()).toInstant();
    }

    /**
     * A window's closing instant. {@link LocalTime#MAX} (used by the always-on model) is
     * treated as the next day's midnight so consecutive 24h days join seamlessly with no
     * sub-second gap at the date boundary.
     */
    private Instant winClose(Model m, LocalDate date, TimeRange w) {
        if (w.end().equals(LocalTime.MAX)) {
            return ZonedDateTime.of(date.plusDays(1), LocalTime.MIDNIGHT, m.zone()).toInstant();
        }
        return ZonedDateTime.of(date, w.end(), m.zone()).toInstant();
    }

    /** True if {@code at} falls inside a working window (clock actively ticking). */
    public boolean isWithinBusinessHours(Model m, Instant at) {
        LocalDate date = at.atZone(m.zone()).toLocalDate();
        for (TimeRange w : windowsFor(m, date)) {
            if (!at.isBefore(winOpen(m, date, w)) && at.isBefore(winClose(m, date, w))) {
                return true;
            }
        }
        return false;
    }

    /**
     * The instant at which {@code targetSeconds} of business-time, accumulated from
     * {@code start}, runs out. If {@code start} is outside business hours the clock only
     * begins at the next working window.
     */
    public Instant dueAt(Model m, Instant start, long targetSeconds) {
        if (targetSeconds <= 0) {
            return start;
        }
        long remaining = targetSeconds;
        LocalDate date = start.atZone(m.zone()).toLocalDate();
        for (int guard = 0; guard < MAX_DAYS; guard++, date = date.plusDays(1)) {
            for (TimeRange w : windowsFor(m, date)) {
                Instant open = winOpen(m, date, w);
                Instant close = winClose(m, date, w);
                Instant segStart = open.isBefore(start) ? start : open;
                if (!segStart.isBefore(close)) {
                    continue; // this window is entirely before the clock starts
                }
                long avail = Duration.between(segStart, close).getSeconds();
                if (remaining <= avail) {
                    return segStart.plusSeconds(remaining);
                }
                remaining -= avail;
            }
        }
        // Unreachable for sane calendars/targets; degrade to wall-clock rather than loop forever.
        return start.plusSeconds(targetSeconds);
    }

    /** Business-time (seconds) elapsed between {@code from} and {@code to}; zero if reversed. */
    public long elapsedBusinessSeconds(Model m, Instant from, Instant to) {
        if (to == null || from == null || !to.isAfter(from)) {
            return 0;
        }
        long total = 0;
        LocalDate date = from.atZone(m.zone()).toLocalDate();
        LocalDate endDate = to.atZone(m.zone()).toLocalDate();
        for (int guard = 0; !date.isAfter(endDate) && guard < MAX_DAYS; guard++, date = date.plusDays(1)) {
            for (TimeRange w : windowsFor(m, date)) {
                Instant open = winOpen(m, date, w);
                Instant close = winClose(m, date, w);
                Instant segStart = open.isBefore(from) ? from : open;
                Instant segEnd = close.isAfter(to) ? to : close;
                if (segEnd.isAfter(segStart)) {
                    total += Duration.between(segStart, segEnd).getSeconds();
                }
            }
        }
        return total;
    }

    /** Convenience: the working windows for a date (used by callers building previews). */
    public List<TimeRange> workingWindows(Model m, LocalDate date) {
        return new ArrayList<>(windowsFor(m, date));
    }
}
