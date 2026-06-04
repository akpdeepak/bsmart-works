package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class StatusDurationServiceTest {

    // compute() is pure — collaborators are unused, so nulls are safe.
    private final StatusDurationService service = new StatusDurationService(null, null);

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
