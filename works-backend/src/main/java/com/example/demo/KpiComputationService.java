package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Computes KPI values from the work-item store and the append-only event log (iteration 12, Cap L).
 * It is the I/O half of the framework: it resolves a scope predicate (via {@link AggregationService})
 * into honest, data-derived metrics, then hands the numbers to the pure scoring/statistics services.
 *
 * <p>Crucially, it <strong>never groups by assignee</strong> for an aggregated scope — there is no code
 * path here that produces a per-individual breakdown above the personal layer. Cycle/lead times are
 * projected from {@code STATUS_CHANGED} events (the honest source the spec asks for); metrics whose data
 * source is not yet wired (PR turnaround → needs the iteration-13 integrations; blocked-time aggregation)
 * are reported as <em>unavailable</em> rather than faked (RB-20 §4 — honest software).
 *
 * <p>All user-supplied values are bound, never concatenated; only fixed status/type literals appear in
 * the SQL text (RB-10 §6, RB-40 §1).
 */
@Service
public class KpiComputationService {

    /** Metric keys the engine can compute today. The rest are defined-but-unmeasured. */
    static final List<String> COMPUTED_KEYS = List.of(
        "throughput", "completion_rate", "wip", "velocity", "bug_escape", "rework",
        "cycle_time", "lead_time", "commitment_accuracy");

    /** Keys defined in the catalog but not yet measurable here, with the reason. */
    static final Map<String, String> UNAVAILABLE = Map.of(
        "pr_turnaround", "Requires the Git integration (iteration 13).",
        "blocked_time",  "Requires status-duration aggregation (follow-up).");

    private final JdbcTemplate jdbc;
    private final CycleTimeStatsService stats;

    public KpiComputationService(JdbcTemplate jdbc, CycleTimeStatsService stats) {
        this.jdbc = jdbc;
        this.stats = stats;
    }

    /** Computed metric values plus the team-health inputs derived alongside them. */
    public record Computed(Map<String, Double> values, int contributors,
                           List<Double> cycleTimesDays, List<Double> leadTimesDays,
                           SprintInputs sprintInputs) {}

    /** Sprint-derived inputs for the team-health composite. */
    public record SprintInputs(List<Double> commitmentAccuracies, int committedPoints,
                               int addedPoints, int additionsCount) {}

    private String scoped(String suffix, AggregationService.ScopeFilter f) {
        return "WHERE " + f.sql() + " AND deleted_at IS NULL" + suffix;
    }

    /** Distinct contributors (assignees) in scope — the basis for the anonymity-floor decision. */
    public int distinctContributors(AggregationService.ScopeFilter f) {
        Long n = jdbc.queryForObject(
            "SELECT COUNT(DISTINCT assignee_id) FROM work_items "
                + scoped(" AND assignee_id IS NOT NULL", f), Long.class, f.params());
        return n == null ? 0 : n.intValue();
    }

    /** Compute the full metric bundle and the team-health inputs for a scope. */
    public Computed compute(AggregationService.ScopeFilter f) {
        Map<String, Double> v = new LinkedHashMap<>();

        Long done = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items " + scoped(" AND status = 'Done'", f), Long.class, f.params());
        Long total = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items " + scoped("", f), Long.class, f.params());
        Long wip = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items " + scoped(" AND status = 'In Progress'", f), Long.class, f.params());
        Long bugs = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items "
                + scoped(" AND status = 'Done' AND type IN ('Bug','Incident')", f), Long.class, f.params());
        Double velocity = jdbc.queryForObject(
            "SELECT COALESCE(SUM(story_points),0) FROM work_items "
                + scoped(" AND status = 'Done'", f), Double.class, f.params());

        long doneN = done == null ? 0 : done, totalN = total == null ? 0 : total;
        v.put("throughput", (double) doneN);
        v.put("completion_rate", totalN == 0 ? 0.0 : round(100.0 * doneN / totalN));
        v.put("wip", wip == null ? 0.0 : (double) wip);
        v.put("bug_escape", bugs == null ? 0.0 : (double) bugs);
        v.put("velocity", velocity == null ? 0.0 : velocity);
        v.put("rework", (double) reworkCount(f));

        List<double[]> times = leadAndCycleDays(f);
        List<Double> cycle = new ArrayList<>();
        List<Double> lead = new ArrayList<>();
        for (double[] t : times) {
            lead.add(t[0]);
            if (t[1] >= 0) {
                cycle.add(t[1]);
            }
        }
        v.put("lead_time", round(stats.percentile(lead, 85)));
        v.put("cycle_time", round(stats.percentile(cycle, 85)));

        SprintInputs sprintInputs = sprintInputs(f);
        double avgAccuracy = sprintInputs.commitmentAccuracies().isEmpty() ? 0.0
            : sprintInputs.commitmentAccuracies().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        v.put("commitment_accuracy", round(avgAccuracy));

        return new Computed(v, distinctContributors(f), cycle, lead, sprintInputs);
    }

    private int reworkCount(AggregationService.ScopeFilter f) {
        Long n = jdbc.queryForObject(
            "SELECT COUNT(DISTINCT wi.id) FROM work_items wi "
                + "JOIN events e ON e.aggregate_id = wi.id "
                + "AND e.event_type = 'STATUS_CHANGED' AND e.old_value = 'Done' "
                + "WHERE wi.id IN (SELECT id FROM work_items " + scoped("", f) + ")",
            Long.class, f.params());
        return n == null ? 0 : n.intValue();
    }

    /** Per-Done-item [leadDays, cycleDays] (cycleDays = -1 when the item never entered In Progress). */
    public List<double[]> leadAndCycleDays(AggregationService.ScopeFilter f) {
        String sql =
            "SELECT GREATEST(EXTRACT(EPOCH FROM (d.done_at - wi.created_at)) / 86400.0, 0) AS lead_days, "
                + "CASE WHEN p.first_prog IS NOT NULL "
                + "  THEN GREATEST(EXTRACT(EPOCH FROM (d.done_at - p.first_prog)) / 86400.0, 0) END AS cycle_days "
                + "FROM work_items wi "
                + "JOIN (SELECT aggregate_id, MAX(occurred_at) done_at FROM events "
                + "      WHERE event_type = 'STATUS_CHANGED' AND new_value = 'Done' GROUP BY aggregate_id) d "
                + "  ON d.aggregate_id = wi.id "
                + "LEFT JOIN (SELECT aggregate_id, MIN(occurred_at) first_prog FROM events "
                + "      WHERE event_type = 'STATUS_CHANGED' AND new_value = 'In Progress' GROUP BY aggregate_id) p "
                + "  ON p.aggregate_id = wi.id "
                + "WHERE wi.id IN (SELECT id FROM work_items " + scoped(" AND status = 'Done'", f) + ")";
        return jdbc.query(sql, (rs, i) -> {
            double leadDays = rs.getDouble("lead_days");
            double cycleDays = rs.getObject("cycle_days") == null ? -1 : rs.getDouble("cycle_days");
            return new double[]{leadDays, cycleDays};
        }, f.params());
    }

    /** Done items whose cycle time exceeds the outlier threshold (aggregate drill-down, no names). */
    public List<Map<String, Object>> cycleTimeOutliers(AggregationService.ScopeFilter f,
                                                        double thresholdDays, int limit) {
        String sql =
            "SELECT wi.id, wi.title, wi.type, "
                + "GREATEST(EXTRACT(EPOCH FROM (d.done_at - COALESCE(p.first_prog, wi.created_at))) / 86400.0, 0) AS cycle_days "
                + "FROM work_items wi "
                + "JOIN (SELECT aggregate_id, MAX(occurred_at) done_at FROM events "
                + "      WHERE event_type = 'STATUS_CHANGED' AND new_value = 'Done' GROUP BY aggregate_id) d "
                + "  ON d.aggregate_id = wi.id "
                + "LEFT JOIN (SELECT aggregate_id, MIN(occurred_at) first_prog FROM events "
                + "      WHERE event_type = 'STATUS_CHANGED' AND new_value = 'In Progress' GROUP BY aggregate_id) p "
                + "  ON p.aggregate_id = wi.id "
                + "WHERE wi.id IN (SELECT id FROM work_items " + scoped(" AND status = 'Done'", f) + ") "
                + "AND GREATEST(EXTRACT(EPOCH FROM (d.done_at - COALESCE(p.first_prog, wi.created_at))) / 86400.0, 0) > ? "
                + "ORDER BY cycle_days DESC LIMIT ?";
        Object[] params = append(f.params(), thresholdDays, limit);
        return jdbc.query(sql, (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getString("id"));
            m.put("title", rs.getString("title"));
            m.put("type", rs.getString("type"));
            m.put("cycleDays", round(rs.getDouble("cycle_days")));
            return m;
        }, params);
    }

    /** Sprint-derived team-health inputs for the scope (last 6 sprints by start date). */
    public SprintInputs sprintInputs(AggregationService.ScopeFilter f) {
        String sql =
            "SELECT s.start_date, "
                + "SUM(COALESCE(wi.story_points,0)) AS committed, "
                + "SUM(CASE WHEN wi.status = 'Done' THEN COALESCE(wi.story_points,0) ELSE 0 END) AS done_pts, "
                + "SUM(CASE WHEN s.start_date IS NOT NULL AND wi.created_at::date > s.start_date "
                + "         THEN COALESCE(wi.story_points,0) ELSE 0 END) AS added_pts, "
                + "SUM(CASE WHEN s.start_date IS NOT NULL AND wi.created_at::date > s.start_date "
                + "         THEN 1 ELSE 0 END) AS added_cnt "
                + "FROM work_items wi JOIN sprints s ON s.id = wi.sprint_id "
                + "WHERE wi.id IN (SELECT id FROM work_items " + scoped("", f) + ") "
                + "GROUP BY s.id, s.start_date ORDER BY s.start_date DESC NULLS LAST LIMIT 6";
        List<Double> accuracies = new ArrayList<>();
        int[] committedTotal = {0}, addedTotal = {0}, additions = {0};
        jdbc.query(sql, rs -> {
            int committed = rs.getInt("committed");
            int donePts = rs.getInt("done_pts");
            int addedPts = rs.getInt("added_pts");
            int addedCnt = rs.getInt("added_cnt");
            if (committed > 0) {
                accuracies.add(round(Math.min(100.0, 100.0 * donePts / committed)));
            }
            committedTotal[0] += committed;
            addedTotal[0] += addedPts;
            additions[0] += addedCnt;
        }, f.params());
        return new SprintInputs(accuracies, committedTotal[0], addedTotal[0], additions[0]);
    }

    private Object[] append(Object[] base, Object... extra) {
        Object[] out = new Object[base.length + extra.length];
        System.arraycopy(base, 0, out, 0, base.length);
        System.arraycopy(extra, 0, out, base.length, extra.length);
        return out;
    }

    private double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
