package com.bcits.works;

import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Pure scheduling logic for report deliveries — cadence maths, due-check, and
 * field defaults. No I/O, so it is unit-testable in isolation (mirrors
 * DashboardLayoutService / ReportService).
 */
@Service
public class ReportScheduleService {

    /** The next run after {@code from} for the given cadence (defaults to weekly). */
    public OffsetDateTime computeNextRun(String cadence, OffsetDateTime from) {
        OffsetDateTime base = from != null ? from : OffsetDateTime.now();
        return switch (cadence == null ? "WEEKLY" : cadence.toUpperCase()) {
            case "DAILY" -> base.plusDays(1);
            case "MONTHLY" -> base.plusMonths(1);
            default -> base.plusWeeks(1);
        };
    }

    /** A schedule is due when it is active and its next run is at or before now. */
    public boolean isDue(ReportSchedule s, OffsetDateTime now) {
        return s != null && Boolean.TRUE.equals(s.getActive())
            && s.getNextRunAt() != null && !s.getNextRunAt().isAfter(now);
    }

    /** Stamp a new schedule with id, owner, defaults and the first next-run. Mutates and returns it. */
    public ReportSchedule prepareNew(ReportSchedule s, String ownerId) {
        s.setId("RSCH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        s.setOwnerId(ownerId);
        if (s.getCadence() == null) s.setCadence("WEEKLY");
        if (s.getChannel() == null) s.setChannel("IN_APP");
        if (s.getActive() == null) s.setActive(true);
        s.setLastRunAt(null);
        s.setNextRunAt(computeNextRun(s.getCadence(), OffsetDateTime.now()));
        s.setCreatedAt(OffsetDateTime.now());
        return s;
    }

    /** Copy editable fields; changing cadence reschedules the next run from now. */
    public ReportSchedule applyUpdate(ReportSchedule existing, ReportSchedule updated) {
        if (updated.getCadence() != null) {
            existing.setCadence(updated.getCadence());
            existing.setNextRunAt(computeNextRun(updated.getCadence(), OffsetDateTime.now()));
        }
        if (updated.getChannel() != null) existing.setChannel(updated.getChannel());
        if (updated.getRecipients() != null) existing.setRecipients(updated.getRecipients());
        if (updated.getActive() != null) existing.setActive(updated.getActive());
        return existing;
    }
}
