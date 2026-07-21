package com.bcits.works.devsync;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Read DAO for the Developer Workspace surface (Cap U, iteration 14). Owns the {@link JdbcTemplate}
 * SQL that previously lived inline in {@link DeveloperWorkspaceService}, so the service keeps one job
 * — RBAC, AI-control-plane orchestration, and assembly — while data access lives here (RB-10, one job
 * per layer).
 *
 * <p><b>Every query here takes {@code workspaceId} as its first argument and must use it</b>
 * (RB-40 §1). Raw {@code JdbcTemplate} SQL is outside the central Hibernate tenant filter (#243),
 * so this file is the whole of its own tenant boundary — there is no backstop underneath it. The
 * original carve-out preserved the service's predicates verbatim, which also preserved three
 * missing ones ({@link #recentActivity}, {@link #workItemPriority}, and the blocker side of
 * {@link #blockers}); {@code DeveloperWorkspaceTenantIsolationIT} now pins all of them.
 */
@Component
public class DeveloperWorkspaceDao {

    private final JdbcTemplate jdbc;

    public DeveloperWorkspaceDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Open work assigned to the user in this workspace, in-progress first. */
    public List<Map<String, Object>> todaysWork(String workspaceId, String userId) {
        return jdbc.query(
            "SELECT wi.id, wi.title, wi.status, wi.type, wi.priority FROM work_items wi " +
            "JOIN projects p ON p.id = wi.project_id " +
            "WHERE p.workspace_id = ? AND wi.assignee_id = ? AND wi.deleted_at IS NULL " +
            "AND LOWER(wi.status) NOT IN ('done','resolved','closed') " +
            "ORDER BY CASE WHEN LOWER(wi.status) LIKE '%progress%' THEN 0 ELSE 1 END, wi.priority, wi.id",
            (rs, i) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getString("id"));
                m.put("title", rs.getString("title"));
                m.put("status", rs.getString("status"));
                m.put("type", rs.getString("type"));
                m.put("priority", rs.getString("priority"));
                return m;
            }, workspaceId, userId);
    }

    /**
     * Items assigned to the user that are blocked by another, still-open item.
     *
     * <p><b>Both</b> sides of the link are workspace-scoped (RB-40 §1). {@code work_item_links} has
     * no workspace column and nothing constrains {@code target_id} to the source's tenant, so
     * scoping only the blocked item would surface another tenant's {@code blocker_title} through a
     * cross-workspace link. Covered by {@code DeveloperWorkspaceTenantIsolationIT}.
     */
    public List<Map<String, Object>> blockers(String workspaceId, String userId) {
        return jdbc.query(
            "SELECT wi.id, wi.title, wi.status, l.target_id AS blocked_by, t.title AS blocker_title " +
            "FROM work_items wi " +
            "JOIN projects p ON p.id = wi.project_id " +
            "JOIN work_item_links l ON l.source_id = wi.id AND l.link_type = 'BLOCKED_BY' " +
            "JOIN work_items t ON t.id = l.target_id " +
            "JOIN projects tp ON tp.id = t.project_id AND tp.workspace_id = p.workspace_id " +
            "WHERE p.workspace_id = ? AND wi.assignee_id = ? AND wi.deleted_at IS NULL " +
            "AND LOWER(t.status) NOT IN ('done','resolved','closed') " +
            "ORDER BY wi.id",
            (rs, i) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getString("id"));
                m.put("title", rs.getString("title"));
                m.put("status", rs.getString("status"));
                m.put("blockedBy", rs.getString("blocked_by"));
                m.put("blockerTitle", rs.getString("blocker_title"));
                return m;
            }, workspaceId, userId);
    }

    /**
     * The user's 12 most recent events <b>in this workspace</b> (own actor stream).
     *
     * <p>The {@code workspace_id} predicate is what keeps a multi-workspace member's stream apart
     * (RB-40 §1): {@code actor_id} alone matches the same person in every tenant they belong to.
     * {@code events.workspace_id} is nullable (V40 expand step), and a pre-V40 event that names no
     * workspace belongs to no tenant, so equality — which never matches NULL — is the fail-closed
     * behaviour we want. Covered by {@code DeveloperWorkspaceTenantIsolationIT}.
     */
    public List<Map<String, Object>> recentActivity(String workspaceId, String userId) {
        return jdbc.query(
            "SELECT aggregate_id, event_type, occurred_at FROM events " +
            "WHERE workspace_id = ? AND actor_id = ? ORDER BY occurred_at DESC LIMIT 12",
            (rs, i) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("aggregateId", rs.getString("aggregate_id"));
                m.put("eventType", rs.getString("event_type"));
                m.put("occurredAt", rs.getObject("occurred_at"));
                return m;
            }, workspaceId, userId);
    }

    /**
     * The priority of a single work item in this workspace, or {@code null} when it has none, does
     * not exist, or belongs to another tenant.
     *
     * <p>A by-primary-key read is not self-scoping: the caller's id can point anywhere, so the
     * project join carries the workspace predicate (RB-40 §1). The live caller resolves the id from
     * a pull request's {@code work_item_id}, which is an unconstrained free-text column — nothing
     * stops it naming another tenant's item.
     */
    public String workItemPriority(String workspaceId, String workItemId) {
        return jdbc.query(
            "SELECT wi.priority FROM work_items wi JOIN projects p ON p.id = wi.project_id " +
            "WHERE p.workspace_id = ? AND wi.id = ?",
            rs -> rs.next() ? rs.getString(1) : null, workspaceId, workItemId);
    }

    /** The user's private personal-velocity counters (own metrics only — RB-20 §4). */
    public VelocityCounts velocity(String workspaceId, String userId) {
        Integer assigned = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items wi JOIN projects p ON p.id = wi.project_id " +
            "WHERE p.workspace_id = ? AND wi.assignee_id = ? AND wi.deleted_at IS NULL",
            Integer.class, workspaceId, userId);
        Integer done = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items wi JOIN projects p ON p.id = wi.project_id " +
            "WHERE p.workspace_id = ? AND wi.assignee_id = ? AND wi.deleted_at IS NULL " +
            "AND LOWER(wi.status) IN ('done','resolved','closed')",
            Integer.class, workspaceId, userId);
        Double cycleDays = jdbc.queryForObject(
            "SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (wi.updated_at - wi.created_at)) / 86400.0), 0) " +
            "FROM work_items wi JOIN projects p ON p.id = wi.project_id " +
            "WHERE p.workspace_id = ? AND wi.assignee_id = ? AND wi.deleted_at IS NULL " +
            "AND LOWER(wi.status) IN ('done','resolved','closed')",
            Double.class, workspaceId, userId);
        Integer throughput14 = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items wi JOIN projects p ON p.id = wi.project_id " +
            "WHERE p.workspace_id = ? AND wi.assignee_id = ? AND wi.deleted_at IS NULL " +
            "AND LOWER(wi.status) IN ('done','resolved','closed') AND wi.updated_at >= ?",
            Integer.class, workspaceId, userId, OffsetDateTime.now(ZoneOffset.UTC).minusDays(14));
        return new VelocityCounts(
            assigned == null ? 0 : assigned,
            done == null ? 0 : done,
            cycleDays == null ? 0 : cycleDays,
            throughput14 == null ? 0 : throughput14);
    }

    /** "Yesterday" standup lines: items the user completed since {@code since}. */
    public List<String> standupYesterday(String workspaceId, String userId, OffsetDateTime since) {
        return jdbc.queryForList(
            "SELECT wi.id || ': ' || wi.title FROM work_items wi JOIN projects p ON p.id = wi.project_id " +
            "WHERE p.workspace_id = ? AND wi.assignee_id = ? AND wi.deleted_at IS NULL " +
            "AND LOWER(wi.status) IN ('done','resolved','closed') AND wi.updated_at >= ? ORDER BY wi.updated_at DESC",
            String.class, workspaceId, userId, since);
    }

    /** "Today" standup lines: the user's open items, in-progress first. */
    public List<String> standupToday(String workspaceId, String userId) {
        return jdbc.queryForList(
            "SELECT wi.id || ': ' || wi.title FROM work_items wi JOIN projects p ON p.id = wi.project_id " +
            "WHERE p.workspace_id = ? AND wi.assignee_id = ? AND wi.deleted_at IS NULL " +
            "AND LOWER(wi.status) NOT IN ('done','resolved','closed') " +
            "ORDER BY CASE WHEN LOWER(wi.status) LIKE '%progress%' THEN 0 ELSE 1 END, wi.id",
            String.class, workspaceId, userId);
    }

    /** Personal-velocity counters (null-coalesced). */
    public record VelocityCounts(int assigned, int done, double cycleDays, int throughput14) { }
}
