package com.bcits.works.projects;

import com.bcits.works.workitems.api.WorkItem;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Read/write DAO for the Sprint surface. Owns the {@link JdbcTemplate} SQL that previously lived
 * inline in {@link SprintController}, so the controller keeps one job — HTTP, RBAC, and assembly —
 * while data access lives here (RB-10, one job per layer). Access is workspace-scoped at the
 * controller (RB-40 §1); the SQL — including every tenant/sprint predicate — is preserved verbatim
 * from the controller.
 */
@Component
public class SprintDao {

    private final JdbcTemplate jdbc;

    public SprintDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Actual used story points per sprint, batched into a single grouped query to avoid an N+1
     * (previously one SUM query per sprint). Returns a map of sprintId → used points.
     */
    public Map<String, Integer> usedPointsBySprint(List<String> sprintIds) {
        String placeholders = String.join(",", Collections.nCopies(sprintIds.size(), "?"));
        Map<String, Integer> usedBySprint = new HashMap<>();
        jdbc.query(
            "SELECT sprint_id, COALESCE(SUM(story_points), 0) AS pts FROM work_items "
                + "WHERE sprint_id IN (" + placeholders + ") AND deleted_at IS NULL GROUP BY sprint_id",
            rs -> { usedBySprint.put(rs.getString("sprint_id"), rs.getInt("pts")); },
            sprintIds.toArray());
        return usedBySprint;
    }

    /** Clear the sprint from all of its work items (move them back to backlog). */
    public void clearSprintFromItems(String sprintId) {
        jdbc.update("UPDATE work_items SET sprint_id = NULL WHERE sprint_id = ?", sprintId);
    }

    /** Work items in a sprint, backlog order ascending. */
    public List<WorkItem> itemsForSprint(String sprintId) {
        return jdbc.query(
            "SELECT * FROM work_items WHERE sprint_id = ? ORDER BY backlog_order ASC",
            (rs, row) -> {
                WorkItem w = new WorkItem();
                w.setId(rs.getString("id"));
                w.setTitle(rs.getString("title"));
                w.setStatus(rs.getString("status"));
                w.setType(rs.getString("type"));
                w.setAssigneeId(rs.getString("assignee_id"));
                w.setSprintId(rs.getString("sprint_id"));
                w.setStoryPoints(rs.getObject("story_points") != null ? rs.getInt("story_points") : 0);
                w.setPriority(rs.getString("priority"));
                w.setParentId(rs.getString("parent_id"));
                return w;
            }, sprintId);
    }

    /** Assign a work item to a sprint. */
    public void assignItemToSprint(String sprintId, String itemId) {
        jdbc.update("UPDATE work_items SET sprint_id = ? WHERE id = ?", sprintId, itemId);
    }

    /** Remove a work item from a sprint (back to backlog), scoped to that sprint. */
    public void removeItemFromSprint(String itemId, String sprintId) {
        jdbc.update("UPDATE work_items SET sprint_id = NULL WHERE id = ? AND sprint_id = ?", itemId, sprintId);
    }

    /** Status, story points, and type for each work item in a sprint — drives the velocity chart. */
    public List<Map<String, Object>> velocityItems(String sprintId) {
        return jdbc.queryForList(
            "SELECT status, story_points, type FROM work_items WHERE sprint_id = ?", sprintId);
    }

    /**
     * Rolling velocity: the average Done story points across the project's last (up to) three
     * COMPLETED sprints, rounded to the nearest point. Shared by the sprint-planning helper and the
     * capacity board so both speak the same velocity. Returns 0 when there is no completed history.
     */
    public int averageVelocity(String projectId) {
        List<Map<String, Object>> done = jdbc.queryForList(
            "SELECT s.id, COALESCE(SUM(CASE WHEN wi.status = 'Done' THEN wi.story_points ELSE 0 END),0) AS done_points "
            + "FROM sprints s LEFT JOIN work_items wi ON wi.sprint_id = s.id AND wi.deleted_at IS NULL "
            + "WHERE s.project_id = ? AND s.status = 'COMPLETED' GROUP BY s.id ORDER BY s.created_at DESC LIMIT 3",
            projectId);
        if (done.isEmpty()) return 0;
        long sum = done.stream().mapToLong(m -> ((Number) m.get("done_points")).longValue()).sum();
        return (int) Math.round((double) sum / done.size());
    }

    /**
     * Enriched item set for the sprint report — assignee resolved to a display name, plus priority
     * and due date (RB-20 §4: the report should show the full picture, not just counts).
     */
    public List<Map<String, Object>> reportItems(String sprintId) {
        return jdbc.queryForList(
            "SELECT wi.id, wi.title, wi.status, wi.type, wi.story_points, wi.assignee_id, "
            + "wi.priority, wi.due_date, u.full_name AS assignee_name "
            + "FROM work_items wi LEFT JOIN users u ON u.id = wi.assignee_id "
            + "WHERE wi.sprint_id = ?", sprintId);
    }

    /** Items added to a sprint (sprint_id changed TO this sprint), oldest first. */
    public List<Map<String, Object>> scopeChangesAdded(String sprintId) {
        return jdbc.queryForList(
            "SELECT e.occurred_at, 'ADDED' as change_type, e.aggregate_id as work_item_id, " +
            "       wi.title, wi.type, u.full_name as actor_name " +
            "FROM events e " +
            "LEFT JOIN work_items wi ON wi.id = e.aggregate_id " +
            "LEFT JOIN users u ON u.id = e.actor_id " +
            "WHERE e.field_name = 'sprint_id' AND e.new_value = ? " +
            "ORDER BY e.occurred_at ASC", sprintId);
    }

    /** Items removed from a sprint (sprint_id changed FROM this sprint), oldest first. */
    public List<Map<String, Object>> scopeChangesRemoved(String sprintId) {
        return jdbc.queryForList(
            "SELECT e.occurred_at, 'REMOVED' as change_type, e.aggregate_id as work_item_id, " +
            "       wi.title, wi.type, u.full_name as actor_name " +
            "FROM events e " +
            "LEFT JOIN work_items wi ON wi.id = e.aggregate_id " +
            "LEFT JOIN users u ON u.id = e.actor_id " +
            "WHERE e.field_name = 'sprint_id' AND e.old_value = ? " +
            "ORDER BY e.occurred_at ASC", sprintId);
    }
}
