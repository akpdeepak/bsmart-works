package com.bcits.works;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    @Autowired private JdbcTemplate jdbc;

    // Developer dashboard: my items, sprint context, time logs, blockers
    public Map<String, Object> getDeveloperDashboard(String userId) {
        Map<String, Object> result = new LinkedHashMap<>();

        // My open items — already user-scoped via assignee_id; also workspace-scoped through
        // workspace_members → projects join (RB-40 §1 / B10).
        List<Map<String, Object>> myItems = jdbc.queryForList(
            "SELECT wi.id, wi.title, wi.status, wi.type, wi.priority, wi.due_date, wi.project_id, wi.sprint_id, wi.story_points " +
            "FROM work_items wi JOIN projects p ON p.id = wi.project_id " +
            "JOIN workspace_members wm ON wm.workspace_id = p.workspace_id " +
            "WHERE wi.assignee_id = ? AND wi.status != 'Done' AND wi.deleted_at IS NULL AND wm.user_id = ? " +
            "ORDER BY CASE wi.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, wi.due_date NULLS LAST LIMIT 20",
            userId, userId);
        result.put("myOpenItems", myItems);
        result.put("myOpenItemCount", myItems.size());

        // Active sprint — workspace-scoped: only sprints in the caller's workspaces (B10).
        List<Map<String, Object>> activeSprint = jdbc.queryForList(
            "SELECT s.id, s.name, s.goal, s.status, s.capacity, s.start_date, s.end_date, " +
            "COUNT(wi.id) as total_items, " +
            "SUM(CASE WHEN wi.status = 'Done' THEN 1 ELSE 0 END) as done_items, " +
            "COALESCE(SUM(wi.story_points), 0) as total_points, " +
            "COALESCE(SUM(CASE WHEN wi.status = 'Done' THEN wi.story_points ELSE 0 END), 0) as done_points " +
            "FROM sprints s " +
            "JOIN projects p ON p.id = s.project_id " +
            "JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = ? " +
            "LEFT JOIN work_items wi ON wi.sprint_id = s.id AND wi.deleted_at IS NULL " +
            "WHERE s.status = 'ACTIVE' GROUP BY s.id LIMIT 1",
            userId);
        result.put("activeSprint", activeSprint.isEmpty() ? null : activeSprint.get(0));

        // My items in active sprint — workspace-scoped (B10).
        List<Map<String, Object>> mySprintItems = jdbc.queryForList(
            "SELECT wi.id, wi.title, wi.status, wi.type, wi.story_points, wi.priority " +
            "FROM work_items wi " +
            "JOIN sprints s ON s.id = wi.sprint_id " +
            "JOIN projects p ON p.id = wi.project_id " +
            "JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = ? " +
            "WHERE s.status = 'ACTIVE' AND wi.assignee_id = ? AND wi.deleted_at IS NULL",
            userId, userId);
        result.put("mySprintItems", mySprintItems);

        // My recent worklogs (last 7 days)
        List<Map<String, Object>> myLogs = jdbc.queryForList(
            "SELECT wl.id, wl.work_item_id, wl.time_spent_minutes, wl.work_date, wl.description, " +
            "wi.title as work_item_title " +
            "FROM worklogs wl LEFT JOIN work_items wi ON wi.id = wl.work_item_id " +
            "WHERE wl.user_id = ? AND wl.work_date >= CURRENT_DATE - INTERVAL '7 days' " +
            "ORDER BY wl.work_date DESC LIMIT 10",
            userId);
        result.put("recentWorklogs", myLogs);

        // Total hours this week
        List<Map<String, Object>> weekHours = jdbc.queryForList(
            "SELECT COALESCE(SUM(time_spent_minutes), 0) as total_minutes " +
            "FROM worklogs WHERE user_id = ? AND work_date >= CURRENT_DATE - INTERVAL '7 days'",
            userId);
        result.put("weeklyMinutes", weekHours.isEmpty() ? 0 : weekHours.get(0).get("total_minutes"));

        // My blockers (items linked BLOCKED_BY) — workspace-scoped (B10).
        List<Map<String, Object>> blockers = jdbc.queryForList(
            "SELECT wi.id, wi.title, wi.status, wil.link_type, wb.title as blocking_title " +
            "FROM work_item_links wil " +
            "JOIN work_items wi ON wi.id = wil.source_id " +
            "JOIN work_items wb ON wb.id = wil.target_id " +
            "JOIN projects p ON p.id = wi.project_id " +
            "JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = ? " +
            "WHERE wi.assignee_id = ? AND wil.link_type = 'BLOCKED_BY' AND wi.deleted_at IS NULL",
            userId, userId);
        result.put("blockers", blockers);

        // Overdue items — workspace-scoped (B10).
        List<Map<String, Object>> overdue = jdbc.queryForList(
            "SELECT wi.id, wi.title, wi.status, wi.type, wi.priority, wi.due_date FROM work_items wi " +
            "JOIN projects p ON p.id = wi.project_id " +
            "JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = ? " +
            "WHERE wi.assignee_id = ? AND wi.status != 'Done' AND wi.due_date < CURRENT_DATE AND wi.deleted_at IS NULL " +
            "ORDER BY wi.due_date LIMIT 5",
            userId, userId);
        result.put("overdueItems", overdue);

        return result;
    }

    // Scrum Master dashboard: sprint health, velocity, team capacity, scope changes, risks
    public Map<String, Object> getScrumMasterDashboard(String workspaceId) {
        Map<String, Object> result = new LinkedHashMap<>();

        // Active sprint details
        List<Map<String, Object>> activeSprints = jdbc.queryForList(
            "SELECT s.id, s.name, s.goal, s.status, s.capacity, s.start_date, s.end_date, s.project_id, " +
            "COUNT(wi.id) as total_items, " +
            "SUM(CASE WHEN wi.status = 'Done' THEN 1 ELSE 0 END) as done_items, " +
            "SUM(CASE WHEN wi.status IN ('In Progress','In Review') THEN 1 ELSE 0 END) as in_progress_items, " +
            "COALESCE(SUM(wi.story_points), 0) as total_points, " +
            "COALESCE(SUM(CASE WHEN wi.status = 'Done' THEN wi.story_points ELSE 0 END), 0) as done_points " +
            "FROM sprints s LEFT JOIN work_items wi ON wi.sprint_id = s.id AND wi.deleted_at IS NULL " +
            "WHERE s.status = 'ACTIVE' GROUP BY s.id");
        result.put("activeSprints", activeSprints);

        // Velocity trend — last 6 sprints
        List<Map<String, Object>> velocity = jdbc.queryForList(
            "SELECT s.id, s.name, s.status, s.capacity, " +
            "COALESCE(SUM(wi.story_points), 0) as total_points, " +
            "COALESCE(SUM(CASE WHEN wi.status = 'Done' THEN wi.story_points ELSE 0 END), 0) as done_points, " +
            "COUNT(wi.id) as total_items, " +
            "SUM(CASE WHEN wi.status = 'Done' THEN 1 ELSE 0 END) as done_items " +
            "FROM sprints s LEFT JOIN work_items wi ON wi.sprint_id = s.id AND wi.deleted_at IS NULL " +
            "WHERE s.status IN ('ACTIVE', 'COMPLETED') " +
            "GROUP BY s.id ORDER BY s.created_at DESC LIMIT 6");
        result.put("velocityTrend", velocity);

        // Team capacity for active sprint — hours logged per user
        List<Map<String, Object>> teamCapacity = jdbc.queryForList(
            "SELECT u.id, u.full_name, COALESCE(SUM(wl.time_spent_minutes), 0) as logged_minutes, " +
            "COUNT(DISTINCT wl.work_date) as days_logged " +
            "FROM workspace_members wm " +
            "JOIN users u ON u.id = wm.user_id " +
            "LEFT JOIN worklogs wl ON wl.user_id = u.id AND wl.work_date >= CURRENT_DATE - INTERVAL '14 days' " +
            "WHERE wm.workspace_id = ? " +
            "GROUP BY u.id, u.full_name ORDER BY logged_minutes DESC",
            workspaceId);
        result.put("teamCapacity", teamCapacity);

        // Scope changes (items added/removed from active sprint)
        List<Map<String, Object>> scopeChanges = jdbc.queryForList(
            "SELECT e.id, e.aggregate_id as work_item_id, e.event_type, e.occurred_at, e.actor_id, " +
            "e.payload, wi.title, wi.type, wi.story_points, u.full_name as actor_name " +
            "FROM events e " +
            "JOIN work_items wi ON wi.id = e.aggregate_id " +
            "LEFT JOIN users u ON u.id = e.actor_id " +
            "WHERE e.event_type = 'SPRINT_ASSIGNED' AND e.occurred_at >= CURRENT_DATE - INTERVAL '30 days' " +
            "ORDER BY e.occurred_at DESC LIMIT 20");
        result.put("scopeChanges", scopeChanges);

        // High risk items
        List<Map<String, Object>> highRisk = jdbc.queryForList(
            "SELECT wi.id, wi.title, wi.status, wi.type, wi.priority, wi.story_points, wi.assignee_id, " +
            "u.full_name as assignee_name " +
            "FROM work_items wi LEFT JOIN users u ON u.id = wi.assignee_id " +
            "WHERE wi.priority IN ('CRITICAL','HIGH') AND wi.status != 'Done' AND wi.deleted_at IS NULL " +
            "ORDER BY CASE wi.priority WHEN 'CRITICAL' THEN 1 ELSE 2 END LIMIT 10");
        result.put("highRiskItems", highRisk);

        // Sprint health score
        if (!activeSprints.isEmpty()) {
            Map<String, Object> sprint = activeSprints.get(0);
            long total = toLong(sprint.get("total_items"));
            long done = toLong(sprint.get("done_items"));
            int health = total > 0 ? (int) (done * 100 / total) : 100;
            result.put("sprintHealth", health);
        }

        // Risks summary — table is singular: risk
        List<Map<String, Object>> risks = jdbc.queryForList(
            "SELECT status, COUNT(*) as count FROM risk GROUP BY status");
        result.put("risksSummary", risks);

        return result;
    }

    // Product Owner dashboard: releases, backlog breakdown, priorities
    public Map<String, Object> getProductOwnerDashboard(String workspaceId) {
        Map<String, Object> result = new LinkedHashMap<>();

        // Releases with progress
        List<Map<String, Object>> releases = jdbc.queryForList(
            "SELECT r.id, r.name, r.version, r.status, r.release_date, r.project_id, p.name as project_name, " +
            "COUNT(wir.work_item_id) as total_items, " +
            "SUM(CASE WHEN wi.status = 'Done' THEN 1 ELSE 0 END) as done_items, " +
            "COALESCE(SUM(wi.story_points), 0) as total_points, " +
            "COALESCE(SUM(CASE WHEN wi.status = 'Done' THEN wi.story_points ELSE 0 END), 0) as done_points " +
            "FROM releases r " +
            "LEFT JOIN projects p ON p.id = r.project_id " +
            "LEFT JOIN work_item_releases wir ON wir.release_id = r.id " +
            "LEFT JOIN work_items wi ON wi.id = wir.work_item_id AND wi.deleted_at IS NULL " +
            "WHERE r.status != 'ARCHIVED' " +
            "GROUP BY r.id, r.name, r.version, r.status, r.release_date, r.project_id, p.name " +
            "ORDER BY r.release_date NULLS LAST LIMIT 10");
        result.put("releases", releases);

        // Backlog breakdown by type
        List<Map<String, Object>> backlogByType = jdbc.queryForList(
            "SELECT type, COUNT(*) as count FROM work_items " +
            "WHERE status != 'Done' AND deleted_at IS NULL GROUP BY type ORDER BY count DESC");
        result.put("backlogByType", backlogByType);

        // Priority distribution
        List<Map<String, Object>> priorityDist = jdbc.queryForList(
            "SELECT priority, COUNT(*) as count FROM work_items " +
            "WHERE status != 'Done' AND deleted_at IS NULL GROUP BY priority " +
            "ORDER BY CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END");
        result.put("priorityDistribution", priorityDist);

        // Feature completion rate — types are uppercase since the V68 work-item type
        // redesign; UPPER() also matches any pre-redesign 'Story' rows.
        List<Map<String, Object>> featureStats = jdbc.queryForList(
            "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as done " +
            "FROM work_items WHERE UPPER(type) = 'STORY' AND deleted_at IS NULL");
        result.put("featureStats", featureStats.isEmpty() ? null : featureStats.get(0));

        // Ungroomed backlog (items without sprint, not Done)
        List<Map<String, Object>> ungroomed = jdbc.queryForList(
            "SELECT id, title, type, priority, story_points FROM work_items " +
            "WHERE sprint_id IS NULL AND status != 'Done' AND deleted_at IS NULL " +
            "ORDER BY CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END LIMIT 10");
        result.put("ungroomedItems", ungroomed);
        result.put("ungroomedCount",
            jdbc.queryForObject(
                "SELECT COUNT(*) FROM work_items WHERE sprint_id IS NULL AND status != 'Done' AND deleted_at IS NULL",
                Long.class));

        // Upcoming releases (next 3 months)
        List<Map<String, Object>> upcoming = jdbc.queryForList(
            "SELECT id, name, version, status, release_date FROM releases " +
            "WHERE status IN ('PLANNED','IN_PROGRESS') AND (release_date IS NULL OR release_date >= CURRENT_DATE) " +
            "ORDER BY release_date NULLS LAST LIMIT 5");
        result.put("upcomingReleases", upcoming);

        return result;
    }

    // Executive dashboard: portfolio, releases, RAID summary, team utilization
    public Map<String, Object> getExecutiveDashboard(String workspaceId) {
        Map<String, Object> result = new LinkedHashMap<>();

        // Project portfolio health — is_archived column exists in projects
        List<Map<String, Object>> portfolio = jdbc.queryForList(
            "SELECT p.id, p.name, p.key_prefix, " +
            "COUNT(wi.id) as total_items, " +
            "SUM(CASE WHEN wi.status = 'Done' THEN 1 ELSE 0 END) as done_items, " +
            "SUM(CASE WHEN wi.priority IN ('CRITICAL','HIGH') AND wi.status != 'Done' THEN 1 ELSE 0 END) as high_priority_open " +
            "FROM projects p LEFT JOIN work_items wi ON wi.project_id = p.id AND wi.deleted_at IS NULL " +
            "WHERE p.is_archived = false OR p.is_archived IS NULL " +
            "GROUP BY p.id, p.name, p.key_prefix ORDER BY p.name");
        result.put("projectPortfolio", portfolio);

        // Release schedule (all non-archived)
        List<Map<String, Object>> releaseSchedule = jdbc.queryForList(
            "SELECT r.id, r.name, r.version, r.status, r.release_date, p.name as project_name, " +
            "COUNT(wir.work_item_id) as total_items, " +
            "SUM(CASE WHEN wi.status = 'Done' THEN 1 ELSE 0 END) as done_items " +
            "FROM releases r LEFT JOIN projects p ON p.id = r.project_id " +
            "LEFT JOIN work_item_releases wir ON wir.release_id = r.id " +
            "LEFT JOIN work_items wi ON wi.id = wir.work_item_id AND wi.deleted_at IS NULL " +
            "WHERE r.status != 'ARCHIVED' " +
            "GROUP BY r.id, r.name, r.version, r.status, r.release_date, p.name " +
            "ORDER BY r.release_date NULLS LAST LIMIT 10");
        result.put("releaseSchedule", releaseSchedule);

        // Overall RAID summary — tables are singular: risk, pm_issue, action_item, dependency
        List<Map<String, Object>> raidSummary = jdbc.queryForList(
            "SELECT 'risks' as type, COUNT(*) as total, SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open FROM risk " +
            "UNION ALL SELECT 'issues', COUNT(*), SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) FROM pm_issue " +
            "UNION ALL SELECT 'actions', COUNT(*), SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) FROM action_item " +
            "UNION ALL SELECT 'dependencies', COUNT(*), SUM(CASE WHEN is_blocker = true THEN 1 ELSE 0 END) FROM dependency");
        result.put("raidSummary", raidSummary);

        // Team utilization (last 30 days)
        List<Map<String, Object>> utilization = jdbc.queryForList(
            "SELECT u.id, u.full_name, COALESCE(SUM(wl.time_spent_minutes), 0) as logged_minutes " +
            "FROM workspace_members wm JOIN users u ON u.id = wm.user_id " +
            "LEFT JOIN worklogs wl ON wl.user_id = u.id AND wl.work_date >= CURRENT_DATE - INTERVAL '30 days' " +
            "WHERE wm.workspace_id = ? GROUP BY u.id, u.full_name ORDER BY logged_minutes DESC LIMIT 15",
            workspaceId);
        result.put("teamUtilization", utilization);

        // Overall health score (% of items done across all projects)
        List<Map<String, Object>> overallHealth = jdbc.queryForList(
            "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as done " +
            "FROM work_items WHERE deleted_at IS NULL");
        if (!overallHealth.isEmpty()) {
            long total = toLong(overallHealth.get(0).get("total"));
            long done = toLong(overallHealth.get(0).get("done"));
            result.put("overallHealth", total > 0 ? (int) (done * 100 / total) : 100);
        }

        // Overdue action items — table is singular: action_item
        List<Map<String, Object>> overdueActions = jdbc.queryForList(
            "SELECT ai.id, ai.title, ai.due_date, ai.status, u.full_name as owner_name " +
            "FROM action_item ai LEFT JOIN users u ON u.id = ai.owner_id " +
            "WHERE ai.status NOT IN ('DONE','CANCELLED') AND ai.due_date < CURRENT_DATE " +
            "ORDER BY ai.due_date LIMIT 5");
        result.put("overdueActions", overdueActions);

        return result;
    }

    // Admin dashboard: members, role distribution, audit log, workspace stats
    public Map<String, Object> getAdminDashboard(String workspaceId) {
        Map<String, Object> result = new LinkedHashMap<>();

        // Member list with role — workspace_members uses role_id (not role_def_id)
        List<Map<String, Object>> members = jdbc.queryForList(
            "SELECT u.id, u.full_name, u.email, u.created_at, wm.role_id as role, " +
            "MAX(e.occurred_at) as last_active " +
            "FROM workspace_members wm JOIN users u ON u.id = wm.user_id " +
            "LEFT JOIN events e ON e.actor_id = u.id " +
            "WHERE wm.workspace_id = ? " +
            "GROUP BY u.id, u.full_name, u.email, u.created_at, wm.role_id " +
            "ORDER BY last_active DESC NULLS LAST",
            workspaceId);
        result.put("members", members);
        result.put("memberCount", members.size());

        // Role distribution — using role_id
        List<Map<String, Object>> roleDist = jdbc.queryForList(
            "SELECT role_id as role, COUNT(*) as count FROM workspace_members WHERE workspace_id = ? GROUP BY role_id",
            workspaceId);
        result.put("roleDistribution", roleDist);

        // Recent audit log — role_audit_log uses target_user + changed_by (not actor_id/target_user_id)
        // No action_type column exists; joining users on changed_by and target_user
        List<Map<String, Object>> auditLog = jdbc.queryForList(
            "SELECT ral.id, ral.changed_at, ral.old_role, ral.new_role, " +
            "actor.full_name as actor_name, target.full_name as target_name " +
            "FROM role_audit_log ral " +
            "LEFT JOIN users actor ON actor.id = ral.changed_by " +
            "LEFT JOIN users target ON target.id = ral.target_user " +
            "ORDER BY ral.changed_at DESC LIMIT 15");
        result.put("recentAuditLog", auditLog);

        // Activity stats (last 7 days from events)
        List<Map<String, Object>> activityStats = jdbc.queryForList(
            "SELECT event_type, COUNT(*) as count FROM events " +
            "WHERE occurred_at >= NOW() - INTERVAL '7 days' GROUP BY event_type ORDER BY count DESC LIMIT 10");
        result.put("activityStats", activityStats);

        // Total events last 7 days
        Long totalEvents = jdbc.queryForObject(
            "SELECT COUNT(*) FROM events WHERE occurred_at >= NOW() - INTERVAL '7 days'", Long.class);
        result.put("totalEventsWeek", totalEvents);

        // MFA adoption — is_active column exists in users (added in V7)
        List<Map<String, Object>> mfaStats = jdbc.queryForList(
            "SELECT COUNT(*) as total, SUM(CASE WHEN mfa_enabled = true THEN 1 ELSE 0 END) as mfa_enabled " +
            "FROM users WHERE is_active = true");
        result.put("mfaStats", mfaStats.isEmpty() ? null : mfaStats.get(0));

        return result;
    }

    private long toLong(Object val) {
        if (val == null) return 0;
        if (val instanceof Long) return (Long) val;
        if (val instanceof Integer) return ((Integer) val).longValue();
        if (val instanceof Number) return ((Number) val).longValue();
        try {
            return Long.parseLong(val.toString());
        } catch (Exception e) {
            return 0;
        }
    }
}
