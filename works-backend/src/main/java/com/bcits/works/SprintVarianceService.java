package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Cap V · Sprint variance analytics for the cockpit: committed vs delivered points, a
 * day-by-day burndown derived from {@code status_changed_at} (V74 — when each item entered
 * its current status, so Done items burn down on their completion day), scope-change counts
 * from the events table, ceremony attendance rate, and retro/meeting action follow-through.
 * Deterministic — no AI; everything is computed from workspace-scoped data (RB-40 §1).
 * "Done" as the delivered status follows the existing cockpit convention
 * ({@link Iteration15AiService}).
 */
@Service
public class SprintVarianceService {

    private final JdbcTemplate jdbc;
    private final SprintRepository sprints;
    private final RbacService rbac;

    public SprintVarianceService(JdbcTemplate jdbc, SprintRepository sprints, RbacService rbac) {
        this.jdbc = jdbc;
        this.sprints = sprints;
        this.rbac = rbac;
    }

    private void assertProjectInWorkspace(String workspaceId, String projectId) {
        String owner = rbac.workspaceForProject(projectId);
        if (owner == null || !owner.equals(workspaceId)) {
            throw ApiException.notFound("Project", projectId);
        }
    }

    // ── Pure helpers (unit-testable) ──────────────────────────────────────────
    /**
     * Remaining points per day from start to {@code upTo} (inclusive): committed total minus
     * the points completed on or before each day. Pure.
     */
    static List<Map<String, Object>> burndown(LocalDate start, LocalDate upTo, int committedPoints,
                                              Map<LocalDate, Integer> donePointsByDay) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (start == null || upTo == null || upTo.isBefore(start)) return out;
        int burned = 0;
        for (LocalDate day = start; !day.isAfter(upTo); day = day.plusDays(1)) {
            burned += donePointsByDay.getOrDefault(day, 0);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", day.toString());
            row.put("remaining", Math.max(committedPoints - burned, 0));
            out.add(row);
        }
        return out;
    }

    /** Whole-percent rate, 0 when there is nothing to count. Pure. */
    static int rate(long part, long whole) {
        return whole <= 0 ? 0 : (int) Math.round(part * 100.0 / whole);
    }

    public Map<String, Object> variance(String workspaceId, String userId, String sprintId) {
        Sprint sprint = sprints.findById(sprintId).orElseThrow(() -> ApiException.notFound("Sprint", sprintId));
        assertProjectInWorkspace(workspaceId, sprint.getProjectId());

        // Committed vs delivered.
        Map<String, Object> points = jdbc.queryForMap(
            "SELECT COALESCE(SUM(story_points), 0) AS committed, "
            + "COALESCE(SUM(CASE WHEN status = 'Done' THEN story_points ELSE 0 END), 0) AS delivered, "
            + "COUNT(*) AS items, COUNT(*) FILTER (WHERE status = 'Done') AS done_items "
            + "FROM work_items WHERE sprint_id = ? AND deleted_at IS NULL", sprintId);
        int committed = ((Number) points.get("committed")).intValue();
        int delivered = ((Number) points.get("delivered")).intValue();

        // Burndown: Done items burn on the day they entered Done (status_changed_at, V74).
        Map<LocalDate, Integer> doneByDay = new TreeMap<>();
        for (Map<String, Object> row : jdbc.queryForList(
                "SELECT status_changed_at, COALESCE(story_points, 0) AS pts FROM work_items "
                + "WHERE sprint_id = ? AND deleted_at IS NULL AND status = 'Done' "
                + "AND status_changed_at IS NOT NULL", sprintId)) {
            LocalDate day = CockpitDigestService.jdbcDay(row.get("status_changed_at"));
            doneByDay.merge(day, ((Number) row.get("pts")).intValue(), Integer::sum);
        }
        LocalDate today = LocalDate.now();
        LocalDate upTo = sprint.getEndDate() == null || today.isBefore(sprint.getEndDate())
                ? today : sprint.getEndDate();

        // Scope change after the sprint started, from the append-only events table.
        Integer addedAfterStart = jdbc.queryForObject(
            "SELECT COUNT(*) FROM events WHERE field_name = 'sprint_id' AND new_value = ? "
            + "AND (? IS NULL OR occurred_at >= ?)",
            Integer.class, sprintId, sprint.getStartDate(), sprint.getStartDate());
        Integer removed = jdbc.queryForObject(
            "SELECT COUNT(*) FROM events WHERE field_name = 'sprint_id' AND old_value = ?",
            Integer.class, sprintId);

        // Ceremony attendance across the sprint's completed ceremonies.
        Map<String, Object> attendance = jdbc.queryForMap(
            "SELECT COUNT(*) FILTER (WHERE ca.status = 'JOINED') AS joined, "
            + "COUNT(*) FILTER (WHERE ca.status IN ('JOINED','ABSENT','EXPECTED')) AS eligible, "
            + "COUNT(DISTINCT cs.id) AS sessions "
            + "FROM ceremony_sessions cs LEFT JOIN ceremony_attendees ca ON ca.session_id = cs.id "
            + "WHERE cs.sprint_id = ? AND cs.status = 'COMPLETED'", sprintId);

        // Retro/meeting action follow-through for the project over the sprint window.
        Map<String, Object> actions = jdbc.queryForMap(
            "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'DONE') AS done "
            + "FROM action_item WHERE project_id = ? AND deleted_at IS NULL "
            + "AND (? IS NULL OR created_at >= ?)",
            sprint.getProjectId(), sprint.getStartDate(), sprint.getStartDate());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sprint", sprint);
        out.put("committedPoints", committed);
        out.put("deliveredPoints", delivered);
        out.put("deliveryRate", rate(delivered, committed));
        out.put("itemCount", ((Number) points.get("items")).intValue());
        out.put("doneItemCount", ((Number) points.get("done_items")).intValue());
        out.put("burndown", burndown(sprint.getStartDate(), upTo, committed, doneByDay));
        out.put("scopeAddedAfterStart", addedAfterStart);
        out.put("scopeRemoved", removed);
        out.put("attendanceRate", rate(((Number) attendance.get("joined")).longValue(),
                ((Number) attendance.get("eligible")).longValue()));
        out.put("ceremoniesHeld", ((Number) attendance.get("sessions")).intValue());
        out.put("actionTotal", ((Number) actions.get("total")).intValue());
        out.put("actionDone", ((Number) actions.get("done")).intValue());
        out.put("actionFollowThroughRate", rate(((Number) actions.get("done")).longValue(),
                ((Number) actions.get("total")).longValue()));
        return out;
    }
}
