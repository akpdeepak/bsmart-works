package com.bcits.works;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Auto status-duration tracking (iteration 7, Cap B): how long a work item has spent in each
 * status, projected from the append-only event log — no manual logging. Status changes are already
 * recorded as {@code STATUS_CHANGED} events (work-item update path), so this is a pure projection
 * over them: the timeline is reconstructed from the item's creation through each transition to now.
 *
 * <p>The arithmetic ({@link #compute}) is pure and unit-tested; I/O (loading the item and its events)
 * is a thin wrapper. This is the honest cycle-time source the spec calls for.
 */
@Service
public class StatusDurationService {

    private final JdbcTemplate jdbc;
    private final EventRepository events;

    public StatusDurationService(JdbcTemplate jdbc, EventRepository events) {
        this.jdbc = jdbc;
        this.events = events;
    }

    /** A status transition: {@code from} → {@code to} at {@code at}. */
    public record StatusChange(String from, String to, OffsetDateTime at) { }

    /** Total time and entry count for one status. */
    public record StatusDuration(String status, long totalSeconds, int timesEntered) { }

    /**
     * Lead/cycle metrics for a work item. {@code leadSeconds} = created → first DONE-category status
     * (or → now while not done). {@code cycleSeconds} = first IN_PROGRESS-category status → first DONE
     * (or → now while running); null when the item has never entered an in-progress status.
     */
    public record StatusTimelineMetrics(List<StatusDuration> durations, long leadSeconds,
                                        Long cycleSeconds, boolean completed, boolean started) { }

    /** Load a work item's status timeline and project per-status durations. Empty if unknown. */
    public List<StatusDuration> forWorkItem(String workItemId) {
        Loaded l = load(workItemId);
        if (l == null) return List.of();
        return compute(l.createdAt(), l.currentStatus(), l.changes(), OffsetDateTime.now());
    }

    /**
     * Lead and cycle time, using a status-name → category resolver (TODO | IN_PROGRESS | DONE).
     * Boundaries use the FIRST time each category is reached (reopens after Done don't move them).
     */
    public StatusTimelineMetrics metricsForWorkItem(String workItemId,
                                                    java.util.function.Function<String, String> categoryOf) {
        Loaded l = load(workItemId);
        if (l == null) return new StatusTimelineMetrics(List.of(), 0, null, false, false);
        return computeMetrics(l.createdAt(), l.currentStatus(), l.changes(), OffsetDateTime.now(), categoryOf);
    }

    /**
     * Pure lead/cycle projection. Lead = createdAt → first DONE (or → now). Cycle = first IN_PROGRESS
     * → first DONE (or → now); null when no IN_PROGRESS was ever entered. Boundaries are the FIRST
     * time each category is reached. Unit-tested alongside {@link #compute}.
     */
    StatusTimelineMetrics computeMetrics(OffsetDateTime createdAt, String currentStatus,
                                         List<StatusChange> changes, OffsetDateTime now,
                                         java.util.function.Function<String, String> categoryOf) {
        List<StatusDuration> durations = compute(createdAt, currentStatus, changes, now);
        if (createdAt == null) return new StatusTimelineMetrics(durations, 0, null, false, false);

        String initial = (!changes.isEmpty() && changes.get(0).from() != null)
            ? changes.get(0).from() : currentStatus;
        OffsetDateTime firstInProgress = "IN_PROGRESS".equals(cat(categoryOf, initial)) ? createdAt : null;
        OffsetDateTime firstDone = "DONE".equals(cat(categoryOf, initial)) ? createdAt : null;
        for (StatusChange c : changes) {
            String category = cat(categoryOf, c.to());
            if (firstInProgress == null && "IN_PROGRESS".equals(category)) firstInProgress = c.at();
            if (firstDone == null && "DONE".equals(category)) firstDone = c.at();
        }
        boolean completed = firstDone != null;
        boolean started = firstInProgress != null;
        long leadSeconds = Math.max(0, seconds(createdAt, completed ? firstDone : now));
        Long cycleSeconds = started ? Math.max(0, seconds(firstInProgress, completed ? firstDone : now)) : null;
        return new StatusTimelineMetrics(durations, leadSeconds, cycleSeconds, completed, started);
    }

    private static String cat(java.util.function.Function<String, String> categoryOf, String status) {
        String c = status == null ? null : categoryOf.apply(status);
        return c == null ? "TODO" : c;
    }

    /** Item creation time, current status, and ordered status changes — or null if the item is unknown. */
    private record Loaded(OffsetDateTime createdAt, String currentStatus, List<StatusChange> changes) { }

    private Loaded load(String workItemId) {
        Map<String, Object> item;
        try {
            item = jdbc.queryForMap("SELECT status, created_at FROM work_items WHERE id = ?", workItemId);
        } catch (RuntimeException ex) {
            return null;
        }
        String currentStatus = (String) item.get("status");
        OffsetDateTime createdAt = toOffset(item.get("created_at"));
        List<StatusChange> changes = new ArrayList<>();
        for (AppEvent e : events.findByAggregateIdOrderByOccurredAtAsc(workItemId)) {
            if ("STATUS_CHANGED".equals(e.getEventType())) {
                changes.add(new StatusChange(e.getOldValue(), e.getNewValue(), e.getOccurredAt()));
            }
        }
        return new Loaded(createdAt, currentStatus, changes);
    }

    /**
     * Pure projection: walk the timeline from {@code createdAt} through each change to {@code now},
     * summing seconds per status and counting how many times each status was entered. Negative
     * spans (clock skew / out-of-order events) are clamped to zero.
     */
    List<StatusDuration> compute(OffsetDateTime createdAt, String currentStatus,
                                 List<StatusChange> changes, OffsetDateTime now) {
        if (createdAt == null) return List.of();

        Map<String, long[]> acc = new LinkedHashMap<>(); // status -> [seconds, entries]
        String initial = (!changes.isEmpty() && changes.get(0).from() != null)
            ? changes.get(0).from() : currentStatus;

        String prevStatus = initial;
        OffsetDateTime prevTime = createdAt;
        enter(acc, prevStatus);

        for (StatusChange c : changes) {
            add(acc, prevStatus, seconds(prevTime, c.at()));
            prevStatus = c.to();
            prevTime = c.at();
            enter(acc, prevStatus);
        }
        add(acc, prevStatus, seconds(prevTime, now));

        List<StatusDuration> out = new ArrayList<>();
        for (Map.Entry<String, long[]> e : acc.entrySet()) {
            if (e.getKey() == null) continue; {
            out.add(new StatusDuration(e.getKey(), e.getValue()[0], (int) e.getValue()[1]));
            }
        }
        return out;
    }

    private void enter(Map<String, long[]> acc, String status) {
        acc.computeIfAbsent(status, k -> new long[2])[1] += 1;
    }

    private void add(Map<String, long[]> acc, String status, long seconds) {
        acc.computeIfAbsent(status, k -> new long[2])[0] += Math.max(0, seconds);
    }

    private long seconds(OffsetDateTime from, OffsetDateTime to) {
        if (from == null || to == null) return 0; {
        return Duration.between(from, to).getSeconds();
        }
    }

    private OffsetDateTime toOffset(Object value) {
        if (value instanceof OffsetDateTime odt) return odt;
        if (value instanceof java.sql.Timestamp ts) return ts.toInstant().atOffset(java.time.ZoneOffset.UTC);
        if (value instanceof java.time.Instant i) return i.atOffset(java.time.ZoneOffset.UTC); {
        return null;
        }
    }
}
