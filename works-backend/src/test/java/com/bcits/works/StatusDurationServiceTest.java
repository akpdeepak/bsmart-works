package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class StatusDurationServiceTest {

    // compute()/computeMetrics() are pure — collaborators are unused, so nulls are safe.
    private final StatusDurationService service = new StatusDurationService(null, null);

    // Test category resolver: maps the three canonical status names to their categories.
    private final java.util.function.Function<String, String> cat = s ->
        "In Progress".equals(s) ? "IN_PROGRESS" : "Done".equals(s) ? "DONE" : "TODO";

    private Map<String, StatusDurationService.StatusDuration> byStatus(
            List<StatusDurationService.StatusDuration> list) {
        return list.stream().collect(Collectors.toMap(
            StatusDurationService.StatusDuration::status, d -> d));
    }

    @Test
    void noChanges_attributesAllTimeToCurrentStatus() {
        OffsetDateTime created = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        OffsetDateTime now = created.plusHours(2);
        var result = byStatus(service.compute(created, "Todo", List.of(), now));
        assertEquals(1, result.size());
        assertEquals(7200, result.get("Todo").totalSeconds());
        assertEquals(1, result.get("Todo").timesEntered());
    }

    @Test
    void walksTransitionsAndSumsPerStatus() {
        OffsetDateTime created = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        List<StatusDurationService.StatusChange> changes = List.of(
            new StatusDurationService.StatusChange("Todo", "In Progress", created.plusHours(1)),
            new StatusDurationService.StatusChange("In Progress", "Done", created.plusHours(4)));
        OffsetDateTime now = created.plusHours(5);

        var result = byStatus(service.compute(created, "Done", changes, now));
        assertEquals(3600, result.get("Todo").totalSeconds());          // 0→1h
        assertEquals(10800, result.get("In Progress").totalSeconds());  // 1h→4h
        assertEquals(3600, result.get("Done").totalSeconds());          // 4h→5h (now)
        assertEquals(1, result.get("In Progress").timesEntered());
    }

    @Test
    void reentryCountsTwiceAndSumsBothSpans() {
        OffsetDateTime created = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        List<StatusDurationService.StatusChange> changes = List.of(
            new StatusDurationService.StatusChange("Todo", "In Progress", created.plusHours(1)),
            new StatusDurationService.StatusChange("In Progress", "Todo", created.plusHours(2)),
            new StatusDurationService.StatusChange("Todo", "In Progress", created.plusHours(3)));
        OffsetDateTime now = created.plusHours(4);

        var result = byStatus(service.compute(created, "In Progress", changes, now));
        // Todo: 0→1h plus 2h→3h = 2h; entered twice
        assertEquals(7200, result.get("Todo").totalSeconds());
        assertEquals(2, result.get("Todo").timesEntered());
        // In Progress: 1h→2h plus 3h→4h = 2h; entered twice
        assertEquals(7200, result.get("In Progress").totalSeconds());
        assertEquals(2, result.get("In Progress").timesEntered());
    }

    @Test
    void nullCreatedAt_returnsEmpty() {
        assertTrue(service.compute(null, "Todo", List.of(), OffsetDateTime.now()).isEmpty());
    }

    @Test
    void leadExcludesDone_cycleIsInProgressOnly() {
        OffsetDateTime created = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        List<StatusDurationService.StatusChange> changes = List.of(
            new StatusDurationService.StatusChange("Todo", "In Progress", created.plusHours(1)),
            new StatusDurationService.StatusChange("In Progress", "Done", created.plusHours(4)));
        var m = service.computeMetrics(created, "Done", changes, created.plusHours(5), cat);
        assertEquals(14400, m.leadSeconds());          // Todo 1h + In Progress 3h (Done 1h excluded)
        assertEquals(10800, m.cycleSeconds());         // In Progress 3h
        assertFalse(m.leadRunning());                  // currently Done — lead paused
        assertFalse(m.cycleRunning());
    }

    @Test
    void leadAndCycle_runningWhileInProgress() {
        OffsetDateTime created = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        List<StatusDurationService.StatusChange> changes = List.of(
            new StatusDurationService.StatusChange("Todo", "In Progress", created.plusHours(1)));
        var m = service.computeMetrics(created, "In Progress", changes, created.plusHours(5), cat);
        assertEquals(18000, m.leadSeconds());          // Todo 1h + In Progress 4h (to now)
        assertEquals(14400, m.cycleSeconds());         // In Progress 4h (to now)
        assertTrue(m.leadRunning());
        assertTrue(m.cycleRunning());
    }

    @Test
    void cycleIsZeroWhileStillInTodo_leadStillRuns() {
        OffsetDateTime created = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        var m = service.computeMetrics(created, "Todo", List.of(), created.plusHours(2), cat);
        assertEquals(7200, m.leadSeconds());           // Todo time counts toward lead
        assertEquals(0, m.cycleSeconds());             // never in progress yet
        assertTrue(m.leadRunning());                   // not Done — lead still counting
        assertFalse(m.cycleRunning());
    }

    @Test
    void reopenedFromDone_excludesDoneAndResumesClocks() {
        OffsetDateTime created = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        List<StatusDurationService.StatusChange> changes = List.of(
            new StatusDurationService.StatusChange("Todo", "In Progress", created.plusHours(1)),
            new StatusDurationService.StatusChange("In Progress", "Done", created.plusHours(3)),
            new StatusDurationService.StatusChange("Done", "In Progress", created.plusHours(5)));
        var m = service.computeMetrics(created, "In Progress", changes, created.plusHours(6), cat);
        // Todo 1h; In Progress 2h (1→3) + 1h (5→6) = 3h; Done 2h (3→5) EXCLUDED.
        assertEquals(14400, m.leadSeconds());          // Todo 1h + In Progress 3h
        assertEquals(10800, m.cycleSeconds());         // In Progress 3h (both stints), Done excluded
        assertTrue(m.leadRunning());                   // back in progress — resumed
        assertTrue(m.cycleRunning());
    }

    @Test
    void outOfOrderEventsAreClampedNotNegative() {
        OffsetDateTime created = OffsetDateTime.parse("2026-06-01T05:00:00Z");
        // A change timestamped before creation (clock skew) must not produce negative time: the
        // backward span into Todo clamps to 0, and Done accrues from the (earlier) change to now.
        List<StatusDurationService.StatusChange> changes = List.of(
            new StatusDurationService.StatusChange("Todo", "Done", created.minusHours(1)));
        var result = byStatus(service.compute(created, "Done", changes, created.plusHours(1)));
        assertEquals(0, result.get("Todo").totalSeconds());      // clamped, never negative
        assertEquals(7200, result.get("Done").totalSeconds());   // 04:00 → 06:00
    }
}
