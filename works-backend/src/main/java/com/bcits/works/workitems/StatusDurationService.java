package com.bcits.works.workitems;

import com.bcits.works.shared.AppEvent;
import com.bcits.works.shared.EventRepository;

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
     * Lead/cycle metrics for a work item, by category.
     * <ul>
     *   <li>{@code leadSeconds} = cumulative time the item has lived in TODO + IN_PROGRESS categories
     *       (DONE time is excluded).</li>
     *   <li>{@code cycleSeconds} = cumulative time in IN_PROGRESS only (TODO and DONE excluded).</li>
     * </ul>
     * Both accumulate across reopens — moving Done → In Progress/To Do does not count the Done time
     * and resumes the clocks. {@code leadRunning}/{@code cycleRunning} say whether each clock is
     * currently counting (i.e. the current status is non-Done / In Progress).
     */
    public record StatusTimelineMetrics(List<StatusDuration> durations, long leadSeconds,
                                        long cycleSeconds, boolean leadRunning, boolean cycleRunning,
                                        OffsetDateTime completedAt) { }

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
        if (l == null) return new StatusTimelineMetrics(List.of(), 0, 0, false, false, null);
        return computeMetrics(l.createdAt(), l.currentStatus(), l.changes(), OffsetDateTime.now(), categoryOf);
    }

    /**
     * Pure lead/cycle projection, summed by category from the per-status durations.
     * Lead = Σ time in TODO + IN_PROGRESS; Cycle = Σ time in IN_PROGRESS. DONE time is excluded from
     * both, so reopens (Done → In Progress/To Do) automatically resume the clocks and never count the
     * paused Done period. The current status's running time (up to {@code now}) is already folded into
     * its duration by {@link #compute}, so both metrics are live. Unit-tested alongside {@code compute}.
     */
    StatusTimelineMetrics computeMetrics(OffsetDateTime createdAt, String currentStatus,
                                         List<StatusChange> changes, OffsetDateTime now,
                                         java.util.function.Function<String, String> categoryOf) {
        String currentCategory = cat(categoryOf, currentStatus);
        // When the item is currently Done, stop the clock at the moment it entered Done so the
        // Done-status duration does not keep growing and total workflow time stays fixed.
        OffsetDateTime completedAt = null;
        if ("DONE".equals(currentCategory)) {
            for (int i = changes.size() - 1; i >= 0; i--) {
                if ("DONE".equals(cat(categoryOf, changes.get(i).to()))) {
                    completedAt = changes.get(i).at();
                    break;
                }
            }
            if (completedAt == null) completedAt = createdAt; // item created directly in Done
        }
        OffsetDateTime effectiveNow = completedAt != null ? completedAt : now;
        List<StatusDuration> durations = compute(createdAt, currentStatus, changes, effectiveNow);
        long lead = 0, cycle = 0;
        for (StatusDuration d : durations) {
            String category = cat(categoryOf, d.status());
            if ("IN_PROGRESS".equals(category)) {
                cycle += d.totalSeconds();
                lead += d.totalSeconds();
            } else if ("TODO".equals(category)) {
                lead += d.totalSeconds();
            }
            // DONE is excluded from both lead and cycle.
        }
        boolean leadRunning = !"DONE".equals(currentCategory);
        boolean cycleRunning = "IN_PROGRESS".equals(currentCategory);
        return new StatusTimelineMetrics(durations, lead, cycle, leadRunning, cycleRunning, completedAt);
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
