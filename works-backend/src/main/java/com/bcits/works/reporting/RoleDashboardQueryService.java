package com.bcits.works.reporting;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class RoleDashboardQueryService {

    private final JdbcTemplate jdbc;

    public RoleDashboardQueryService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Map<String, Object> getDeveloperDashboard(String userId, String workspaceId) {
        Map<String, Object> result = new LinkedHashMap<>();

        List<Map<String, Object>> myItems = jdbc.queryForList(
            "SELECT wi.id, wi.title, wi.status, wi.type, wi.priority, wi.due_date, wi.project_id, wi.sprint_id, "
                + "wi.story_points FROM work_items wi JOIN projects p ON p.id = wi.project_id "
                + "WHERE p.workspace_id = ? AND wi.assignee_id = ? "
                + "AND wi.status != 'Done' AND wi.deleted_at IS NULL "
                + "ORDER BY CASE wi.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, "
                + "wi.due_date NULLS LAST LIMIT 20",
            workspaceId, userId);
        result.put("myOpenItems", myItems);
        result.put("myOpenItemCount", myItems.size());

        List<Map<String, Object>> activeSprint = jdbc.queryForList(
            "SELECT s.id, s.name, s.goal, s.status, s.capacity, s.start_date, s.end_date, "
                + "COUNT(wi.id) as total_items, SUM(CASE WHEN wi.status = 'Done' THEN 1 ELSE 0 END) as done_items, "
                + "COALESCE(SUM(wi.story_points), 0) as total_points, "
                + "COALESCE(SUM(CASE WHEN wi.status = 'Done' THEN wi.story_points ELSE 0 END), 0) as done_points "
                + "FROM sprints s JOIN projects p ON p.id = s.project_id "
                + "LEFT JOIN work_items wi ON wi.sprint_id = s.id AND wi.deleted_at IS NULL "
                + "WHERE p.workspace_id = ? AND s.status = 'ACTIVE' GROUP BY s.id LIMIT 1",
            workspaceId);
        result.put("activeSprint", activeSprint.isEmpty() ? null : activeSprint.get(0));

        result.put("mySprintItems", jdbc.queryForList(
            "SELECT wi.id, wi.title, wi.status, wi.type, wi.story_points, wi.priority FROM work_items wi "
                + "JOIN sprints s ON s.id = wi.sprint_id JOIN projects p ON p.id = wi.project_id "
                + "WHERE p.workspace_id = ? AND s.status = 'ACTIVE' "
                + "AND wi.assignee_id = ? AND wi.deleted_at IS NULL",
            workspaceId, userId));

        result.put("recentWorklogs", jdbc.queryForList(
            "SELECT wl.id, wl.work_item_id, wl.time_spent_minutes, wl.work_date, wl.description, "
                + "wi.title as work_item_title FROM worklogs wl JOIN work_items wi ON wi.id = wl.work_item_id "
                + "JOIN projects p ON p.id = wi.project_id "
                + "WHERE p.workspace_id = ? AND wl.user_id = ? "
                + "AND wl.work_date >= CURRENT_DATE - INTERVAL '7 days' "
                + "ORDER BY wl.work_date DESC LIMIT 10",
            workspaceId, userId));

        List<Map<String, Object>> weekHours = jdbc.queryForList(
            "SELECT COALESCE(SUM(wl.time_spent_minutes), 0) as total_minutes "
                + "FROM worklogs wl JOIN work_items wi ON wi.id = wl.work_item_id "
                + "JOIN projects p ON p.id = wi.project_id "
                + "WHERE p.workspace_id = ? AND wl.user_id = ? "
                + "AND wl.work_date >= CURRENT_DATE - INTERVAL '7 days'",
            workspaceId, userId);
        result.put("weeklyMinutes", weekHours.isEmpty() ? 0 : weekHours.get(0).get("total_minutes"));

        result.put("dailyMinutes", jdbc.queryForList(
            "SELECT wl.work_date, COALESCE(SUM(wl.time_spent_minutes), 0) as minutes "
                + "FROM worklogs wl JOIN work_items wi ON wi.id = wl.work_item_id "
                + "JOIN projects p ON p.id = wi.project_id "
                + "WHERE p.workspace_id = ? AND wl.user_id = ? "
                + "AND wl.work_date >= CURRENT_DATE - INTERVAL '6 days' "
                + "GROUP BY wl.work_date ORDER BY wl.work_date",
            workspaceId, userId));

        result.put("blockers", jdbc.queryForList(
            "SELECT wi.id, wi.title, wi.status, wil.link_type, wb.title as blocking_title "
                + "FROM work_item_links wil JOIN work_items wi ON wi.id = wil.source_id "
                + "JOIN work_items wb ON wb.id = wil.target_id JOIN projects p ON p.id = wi.project_id "
                + "WHERE p.workspace_id = ? AND wi.assignee_id = ? "
                + "AND wil.link_type = 'BLOCKED_BY' AND wi.deleted_at IS NULL",
            workspaceId, userId));

        result.put("overdueItems", jdbc.queryForList(
            "SELECT wi.id, wi.title, wi.status, wi.type, wi.priority, wi.due_date FROM work_items wi "
                + "JOIN projects p ON p.id = wi.project_id "
                + "WHERE p.workspace_id = ? AND wi.assignee_id = ? "
                + "AND wi.status != 'Done' AND wi.due_date < CURRENT_DATE "
                + "AND wi.deleted_at IS NULL ORDER BY wi.due_date LIMIT 5",
            workspaceId, userId));

        result.put("pendingReviews", jdbc.queryForList(
            "SELECT pr.id, pr.title, pr.repo, pr.number, pr.url, pr.work_item_id, pr.updated_at "
                + "FROM pull_request_reviewers prr JOIN pull_requests pr ON pr.id = prr.pull_request_id "
                + "WHERE pr.workspace_id = ? AND prr.reviewer_id = ? AND prr.state = 'REQUESTED' "
                + "AND pr.status IN ('OPEN','DRAFT') ORDER BY pr.updated_at DESC LIMIT 5",
            workspaceId, userId));

        result.put("devSyncHighlights", jdbc.queryForList(
            "SELECT DISTINCT pr.id, pr.title, pr.status, pr.repo, pr.number, pr.url, pr.work_item_id, pr.updated_at "
                + "FROM pull_requests pr LEFT JOIN pull_request_reviewers prr ON prr.pull_request_id = pr.id "
                + "WHERE pr.workspace_id = ? AND (pr.author_id = ? OR prr.reviewer_id = ?) "
                + "ORDER BY pr.updated_at DESC LIMIT 5",
            workspaceId, userId, userId));

        return result;
    }

    public Map<String, Object> getScrumMasterDashboard(String workspaceId) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> activeSprints = jdbc.queryForList(
            "SELECT s.id, s.name, s.goal, s.status, s.capacity, s.start_date, s.end_date, s.project_id, "
                + "COUNT(wi.id) as total_items, SUM(CASE WHEN wi.status = 'Done' THEN 1 ELSE 0 END) as done_items, "
                + "SUM(CASE WHEN wi.status IN ('In Progress','In Review') THEN 1 ELSE 0 END) as in_progress_items, "
                + "COALESCE(SUM(wi.story_points), 0) as total_points, "
                + "COALESCE(SUM(CASE WHEN wi.status = 'Done' THEN wi.story_points ELSE 0 END), 0) as done_points "
                + "FROM sprints s JOIN projects p ON p.id = s.project_id "
                + "LEFT JOIN work_items wi ON wi.sprint_id = s.id AND wi.deleted_at IS NULL "
                + "WHERE p.workspace_id = ? AND s.status = 'ACTIVE' GROUP BY s.id",
            workspaceId);
        result.put("activeSprints", activeSprints);

        result.put("velocityTrend", jdbc.queryForList(
            "SELECT s.id, s.name, s.status, s.capacity, COALESCE(SUM(wi.story_points), 0) as total_points, "
                + "COALESCE(SUM(CASE WHEN wi.status = 'Done' THEN wi.story_points ELSE 0 END), 0) as done_points, "
                + "COUNT(wi.id) as total_items, SUM(CASE WHEN wi.status = 'Done' THEN 1 ELSE 0 END) as done_items "
                + "FROM sprints s JOIN projects p ON p.id = s.project_id "
                + "LEFT JOIN work_items wi ON wi.sprint_id = s.id AND wi.deleted_at IS NULL "
                + "WHERE p.workspace_id = ? AND s.status IN ('ACTIVE', 'COMPLETED') "
                + "GROUP BY s.id ORDER BY s.created_at DESC LIMIT 6",
            workspaceId));

        result.put("teamCapacity", jdbc.queryForList(
            "SELECT u.id, u.full_name, COALESCE(SUM(wl.time_spent_minutes), 0) as logged_minutes, "
                + "COUNT(DISTINCT wl.work_date) as days_logged FROM workspace_members wm "
                + "JOIN users u ON u.id = wm.user_id "
                + "LEFT JOIN worklogs wl ON wl.user_id = u.id AND wl.work_date >= CURRENT_DATE - INTERVAL '14 days' "
                + "WHERE wm.workspace_id = ? GROUP BY u.id, u.full_name ORDER BY logged_minutes DESC",
            workspaceId));

        result.put("scopeChanges", jdbc.queryForList(
            "SELECT e.id, e.aggregate_id as work_item_id, e.event_type, e.occurred_at, e.actor_id, "
                + "e.payload, wi.title, wi.type, wi.story_points, u.full_name as actor_name FROM events e "
                + "JOIN work_items wi ON wi.id = e.aggregate_id JOIN projects p ON p.id = wi.project_id "
                + "LEFT JOIN users u ON u.id = e.actor_id WHERE p.workspace_id = ? "
                + "AND e.event_type = 'SPRINT_ASSIGNED' AND e.occurred_at >= CURRENT_DATE - INTERVAL '30 days' "
                + "ORDER BY e.occurred_at DESC LIMIT 20",
            workspaceId));

        result.put("highRiskItems", jdbc.queryForList(
            "SELECT wi.id, wi.title, wi.status, wi.type, wi.priority, wi.story_points, wi.assignee_id, "
                + "u.full_name as assignee_name FROM work_items wi JOIN projects p ON p.id = wi.project_id "
                + "LEFT JOIN users u ON u.id = wi.assignee_id WHERE p.workspace_id = ? "
                + "AND wi.priority IN ('CRITICAL','HIGH') AND wi.status != 'Done' AND wi.deleted_at IS NULL "
                + "ORDER BY CASE wi.priority WHEN 'CRITICAL' THEN 1 ELSE 2 END LIMIT 10",
            workspaceId));

        if (!activeSprints.isEmpty()) {
            Map<String, Object> sprint = activeSprints.get(0);
            long total = DashboardNumbers.toLong(sprint.get("total_items"));
            long done = DashboardNumbers.toLong(sprint.get("done_items"));
            result.put("sprintHealth", total > 0 ? (int) (done * 100 / total) : 100);
        }
        result.put("risksSummary", jdbc.queryForList(
            "SELECT status, COUNT(*) as count FROM risk WHERE workspace_id = ? GROUP BY status", workspaceId));
        return result;
    }

    public Map<String, Object> getProductOwnerDashboard(String workspaceId, String userId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("releases", jdbc.queryForList(
            "SELECT r.id, r.name, r.version, r.status, r.release_date, r.project_id, p.name as project_name, "
                + "COUNT(wir.work_item_id) as total_items, SUM(CASE WHEN wi.status = 'Done' THEN 1 ELSE 0 END) as done_items, "
                + "COALESCE(SUM(wi.story_points), 0) as total_points, "
                + "COALESCE(SUM(CASE WHEN wi.status = 'Done' THEN wi.story_points ELSE 0 END), 0) as done_points "
                + "FROM releases r JOIN projects p ON p.id = r.project_id "
                + "LEFT JOIN work_item_releases wir ON wir.release_id = r.id "
                + "LEFT JOIN work_items wi ON wi.id = wir.work_item_id AND wi.deleted_at IS NULL "
                + "WHERE p.workspace_id = ? AND r.status != 'ARCHIVED' "
                + "GROUP BY r.id, r.name, r.version, r.status, r.release_date, r.project_id, p.name "
                + "ORDER BY r.release_date NULLS LAST LIMIT 10",
            workspaceId));
        result.put("backlogByType", jdbc.queryForList(
            "SELECT wi.type, COUNT(*) as count FROM work_items wi JOIN projects p ON p.id = wi.project_id "
                + "WHERE p.workspace_id = ? AND wi.status != 'Done' AND wi.deleted_at IS NULL "
                + "GROUP BY wi.type ORDER BY count DESC",
            workspaceId));
        result.put("priorityDistribution", jdbc.queryForList(
            "SELECT wi.priority, COUNT(*) as count FROM work_items wi JOIN projects p ON p.id = wi.project_id "
                + "WHERE p.workspace_id = ? AND wi.status != 'Done' AND wi.deleted_at IS NULL GROUP BY wi.priority "
                + "ORDER BY CASE wi.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END",
            workspaceId));
        List<Map<String, Object>> featureStats = jdbc.queryForList(
            "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as done "
                + "FROM work_items wi JOIN projects p ON p.id = wi.project_id "
                + "WHERE p.workspace_id = ? AND UPPER(wi.type) = 'STORY' AND wi.deleted_at IS NULL",
            workspaceId);
        result.put("featureStats", featureStats.isEmpty() ? null : featureStats.get(0));
        result.put("ungroomedItems", jdbc.queryForList(
            "SELECT wi.id, wi.title, wi.type, wi.priority, wi.story_points FROM work_items wi "
                + "JOIN projects p ON p.id = wi.project_id WHERE p.workspace_id = ? AND wi.sprint_id IS NULL "
                + "AND wi.status != 'Done' AND wi.deleted_at IS NULL "
                + "ORDER BY CASE wi.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END LIMIT 10",
            workspaceId));
        result.put("ungroomedCount", jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items wi JOIN projects p ON p.id = wi.project_id "
                + "WHERE p.workspace_id = ? AND wi.sprint_id IS NULL AND wi.status != 'Done' AND wi.deleted_at IS NULL",
            Long.class, workspaceId));
        result.put("upcomingReleases", jdbc.queryForList(
            "SELECT r.id, r.name, r.version, r.status, r.release_date FROM releases r "
                + "JOIN projects p ON p.id = r.project_id WHERE p.workspace_id = ? "
                + "AND r.status IN ('PLANNED','IN_PROGRESS') "
                + "AND (r.release_date IS NULL OR r.release_date >= CURRENT_DATE) "
                + "ORDER BY r.release_date NULLS LAST LIMIT 5",
            workspaceId));
        result.put("approvals", jdbc.queryForList(
            "SELECT a.id, a.title, a.reviewer_due_date, ks.id AS space_id, ks.name AS space_name "
                + "FROM articles a JOIN knowledge_spaces ks ON ks.id = a.space_id "
                + "WHERE ks.workspace_id = ? AND a.reviewer_id = ? AND a.status = 'IN_REVIEW' "
                + "ORDER BY a.reviewer_due_date NULLS LAST, a.submitted_at LIMIT 5",
            workspaceId, userId));
        return result;
    }

    public Map<String, Object> getSupportAgentDashboard(String workspaceId, String userId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("conversations", jdbc.queryForList(
            "SELECT id, subject, status, assigned_agent_id, last_message_at "
                + "FROM chat_conversations WHERE workspace_id = ? AND status != 'RESOLVED' "
                + "ORDER BY CASE status WHEN 'ESCALATED' THEN 1 WHEN 'OPEN' THEN 2 ELSE 3 END, "
                + "last_message_at DESC NULLS LAST LIMIT 10",
            workspaceId));
        Map<String, Object> counts = jdbc.queryForMap(
            "SELECT COUNT(*) FILTER (WHERE status = 'ESCALATED') AS escalated, "
                + "COUNT(*) FILTER (WHERE status = 'OPEN') AS open, "
                + "COUNT(*) FILTER (WHERE assigned_agent_id = ? AND status != 'RESOLVED') AS assigned_to_me, "
                + "COUNT(*) FILTER (WHERE status = 'RESOLVED' AND updated_at >= CURRENT_DATE) AS resolved_today "
                + "FROM chat_conversations WHERE workspace_id = ?",
            userId, workspaceId);
        result.put("escalatedCount", counts.get("escalated"));
        result.put("openCount", counts.get("open"));
        result.put("assignedToMeCount", counts.get("assigned_to_me"));
        result.put("resolvedTodayCount", counts.get("resolved_today"));
        result.put("slaRisks", slaRisks(workspaceId));
        result.put("importantMessages", jdbc.queryForList(
            "SELECT cm.id, cm.conversation_id, cm.body, cm.created_at, cc.subject "
                + "FROM chat_messages cm JOIN chat_conversations cc ON cc.id = cm.conversation_id "
                + "WHERE cm.workspace_id = ? AND cc.workspace_id = ? AND cm.sender_type = 'CUSTOMER' "
                + "AND cc.status != 'RESOLVED' ORDER BY cm.created_at DESC LIMIT 5",
            workspaceId, workspaceId));
        return result;
    }

    public Map<String, Object> getExecutiveDashboard(String workspaceId) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("projectPortfolio", jdbc.queryForList(
            "SELECT p.id, p.name, p.key_prefix, COUNT(wi.id) as total_items, "
                + "SUM(CASE WHEN wi.status = 'Done' THEN 1 ELSE 0 END) as done_items, "
                + "SUM(CASE WHEN wi.priority IN ('CRITICAL','HIGH') AND wi.status != 'Done' THEN 1 ELSE 0 END) "
                + "as high_priority_open FROM projects p "
                + "LEFT JOIN work_items wi ON wi.project_id = p.id AND wi.deleted_at IS NULL "
                + "WHERE p.workspace_id = ? AND (p.is_archived = false OR p.is_archived IS NULL) "
                + "GROUP BY p.id, p.name, p.key_prefix ORDER BY p.name",
            workspaceId));
        result.put("releaseSchedule", jdbc.queryForList(
            "SELECT r.id, r.name, r.version, r.status, r.release_date, p.name as project_name, "
                + "COUNT(wir.work_item_id) as total_items, SUM(CASE WHEN wi.status = 'Done' THEN 1 ELSE 0 END) as done_items "
                + "FROM releases r JOIN projects p ON p.id = r.project_id "
                + "LEFT JOIN work_item_releases wir ON wir.release_id = r.id "
                + "LEFT JOIN work_items wi ON wi.id = wir.work_item_id AND wi.deleted_at IS NULL "
                + "WHERE p.workspace_id = ? AND r.status != 'ARCHIVED' "
                + "GROUP BY r.id, r.name, r.version, r.status, r.release_date, p.name "
                + "ORDER BY r.release_date NULLS LAST LIMIT 10",
            workspaceId));
        result.put("raidSummary", jdbc.queryForList(
            "SELECT 'risks' as type, COUNT(*) as total, SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open "
                + "FROM risk WHERE workspace_id = ? "
                + "UNION ALL SELECT 'issues', COUNT(*), SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) "
                + "FROM pm_issue WHERE workspace_id = ? "
                + "UNION ALL SELECT 'actions', COUNT(*), SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) "
                + "FROM action_item WHERE workspace_id = ? "
                + "UNION ALL SELECT 'dependencies', COUNT(*), SUM(CASE WHEN is_blocker = true THEN 1 ELSE 0 END) "
                + "FROM dependency WHERE workspace_id = ?",
            workspaceId, workspaceId, workspaceId, workspaceId));
        result.put("teamUtilization", jdbc.queryForList(
            "SELECT u.id, u.full_name, COALESCE(SUM(wl.time_spent_minutes), 0) as logged_minutes "
                + "FROM workspace_members wm JOIN users u ON u.id = wm.user_id "
                + "LEFT JOIN worklogs wl ON wl.user_id = u.id AND wl.work_date >= CURRENT_DATE - INTERVAL '30 days' "
                + "WHERE wm.workspace_id = ? GROUP BY u.id, u.full_name ORDER BY logged_minutes DESC LIMIT 15",
            workspaceId));
        List<Map<String, Object>> overallHealth = jdbc.queryForList(
            "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as done "
                + "FROM work_items wi JOIN projects p ON p.id = wi.project_id "
                + "WHERE p.workspace_id = ? AND wi.deleted_at IS NULL",
            workspaceId);
        if (!overallHealth.isEmpty()) {
            long total = DashboardNumbers.toLong(overallHealth.get(0).get("total"));
            long done = DashboardNumbers.toLong(overallHealth.get(0).get("done"));
            result.put("overallHealth", total > 0 ? (int) (done * 100 / total) : 100);
        }
        result.put("overdueActions", jdbc.queryForList(
            "SELECT ai.id, ai.title, ai.due_date, ai.status, u.full_name as owner_name "
                + "FROM action_item ai LEFT JOIN users u ON u.id = ai.owner_id "
                + "WHERE ai.workspace_id = ? AND ai.status NOT IN ('DONE','CANCELLED') "
                + "AND ai.due_date < CURRENT_DATE ORDER BY ai.due_date LIMIT 5",
            workspaceId));
        result.put("slaRisks", slaRisks(workspaceId));
        return result;
    }

    private List<Map<String, Object>> slaRisks(String workspaceId) {
        return jdbc.queryForList(
            "SELECT si.id, si.work_item_id, si.state, si.metric, si.due_at, wi.title "
                + "FROM sla_instances si JOIN work_items wi ON wi.id = si.work_item_id "
                + "JOIN projects p ON p.id = wi.project_id "
                + "WHERE si.workspace_id = ? AND p.workspace_id = ? "
                + "AND (si.state = 'BREACHED' OR (si.state = 'RUNNING' AND si.due_at <= NOW() + INTERVAL '24 hours')) "
                + "ORDER BY CASE si.state WHEN 'BREACHED' THEN 1 ELSE 2 END, si.due_at LIMIT 5",
            workspaceId, workspaceId);
    }

    public Map<String, Object> getAdminDashboard(String workspaceId) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> members = jdbc.queryForList(
            "SELECT u.id, u.full_name, u.email, u.created_at, wm.role_id as role, MAX(e.occurred_at) as last_active "
                + "FROM workspace_members wm JOIN users u ON u.id = wm.user_id "
                + "LEFT JOIN events e ON e.actor_id = u.id WHERE wm.workspace_id = ? "
                + "GROUP BY u.id, u.full_name, u.email, u.created_at, wm.role_id "
                + "ORDER BY last_active DESC NULLS LAST",
            workspaceId);
        result.put("members", members);
        result.put("memberCount", members.size());
        result.put("roleDistribution", jdbc.queryForList(
            "SELECT role_id as role, COUNT(*) as count FROM workspace_members WHERE workspace_id = ? GROUP BY role_id",
            workspaceId));
        result.put("recentAuditLog", jdbc.queryForList(
            "SELECT ral.id, ral.changed_at, ral.old_role, ral.new_role, actor.full_name as actor_name, "
                + "target.full_name as target_name FROM role_audit_log ral "
                + "LEFT JOIN users actor ON actor.id = ral.changed_by "
                + "LEFT JOIN users target ON target.id = ral.target_user "
                + "WHERE ral.workspace_id = ? ORDER BY ral.changed_at DESC LIMIT 15",
            workspaceId));
        result.put("activityStats", jdbc.queryForList(
            "SELECT event_type, COUNT(*) as count FROM events "
                + "WHERE workspace_id = ? AND occurred_at >= NOW() - INTERVAL '7 days' "
                + "GROUP BY event_type ORDER BY count DESC LIMIT 10",
            workspaceId));
        result.put("totalEventsWeek", jdbc.queryForObject(
            "SELECT COUNT(*) FROM events WHERE workspace_id = ? AND occurred_at >= NOW() - INTERVAL '7 days'",
            Long.class, workspaceId));
        List<Map<String, Object>> mfaStats = jdbc.queryForList(
            "SELECT COUNT(*) as total, SUM(CASE WHEN mfa_enabled = true THEN 1 ELSE 0 END) as mfa_enabled "
                + "FROM users u JOIN workspace_members wm ON wm.user_id = u.id "
                + "WHERE wm.workspace_id = ? AND u.is_active = true",
            workspaceId);
        result.put("mfaStats", mfaStats.isEmpty() ? null : mfaStats.get(0));
        return result;
    }
}
