package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap Y · Audit log explorer (iteration 16). A filterable, paginated browse of the append-only
 * {@code events} log (RB-10 §3), strictly scoped to the workspace (RB-40 §1) — an admin can never
 * read another tenant's audit trail. Filters are allow-listed and bound as parameters (never
 * string-concatenated). Common lenses can be saved as reusable queries.
 */
@Service
public class AuditLogService {

    private final JdbcTemplate jdbc;
    private final RbacService rbac;
    private final AuditSavedQueryRepository savedQueries;

    public AuditLogService(JdbcTemplate jdbc, RbacService rbac, AuditSavedQueryRepository savedQueries) {
        this.jdbc = jdbc;
        this.rbac = rbac;
        this.savedQueries = savedQueries;
    }

    private void requireAdmin(String callerId, String wsId) {
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Workspace", wsId);
        }
        if (!rbac.isAdmin(callerId, wsId)) {
            throw ApiException.forbidden("The audit log explorer requires a workspace administrator.");
        }
    }

    public Map<String, Object> query(String callerId, String workspaceId, String eventType,
                                     String actorId, String aggregateId, String search, int page, int size) {
        requireAdmin(callerId, workspaceId);
        int safeSize = Math.min(Math.max(size, 1), 200);
        int safePage = Math.max(page, 0);

        // WHERE is assembled from allow-listed clauses with bound parameters only (no concatenated values).
        StringBuilder where = new StringBuilder("WHERE workspace_id = ?");
        List<Object> args = new ArrayList<>();
        args.add(workspaceId);
        if (notBlank(eventType))   { where.append(" AND event_type = ?"); args.add(eventType.trim()); }
        if (notBlank(actorId))     { where.append(" AND actor_id = ?");   args.add(actorId.trim()); }
        if (notBlank(aggregateId)) { where.append(" AND aggregate_id = ?"); args.add(aggregateId.trim()); }
        if (notBlank(search))      { where.append(" AND (payload ILIKE ? OR event_type ILIKE ?)");
                                     String like = "%" + search.trim() + "%"; args.add(like); args.add(like); }

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM events " + where, Long.class, args.toArray());

        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(safeSize);
        pageArgs.add(safePage * safeSize);
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT e.id, e.event_type, e.aggregate_id, e.actor_id, u.full_name AS actor_name, "
            + "e.field_name, e.old_value, e.new_value, e.payload, e.occurred_at "
            + "FROM events e LEFT JOIN users u ON u.id = e.actor_id " + where
            + " ORDER BY e.occurred_at DESC LIMIT ? OFFSET ?", pageArgs.toArray());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("events", rows);
        out.put("total", total == null ? 0 : total);
        out.put("page", safePage);
        out.put("size", safeSize);
        return out;
    }

    /** Distinct event types in the workspace — powers the filter dropdown. */
    public List<String> eventTypes(String callerId, String workspaceId) {
        requireAdmin(callerId, workspaceId);
        return jdbc.queryForList(
            "SELECT DISTINCT event_type FROM events WHERE workspace_id = ? ORDER BY event_type",
            String.class, workspaceId);
    }

    // ── Saved queries ──────────────────────────────────────────────────────────────
    public List<AuditSavedQuery> listSavedQueries(String callerId, String workspaceId) {
        requireAdmin(callerId, workspaceId);
        return savedQueries.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }

    @Transactional
    public AuditSavedQuery saveQuery(String callerId, AuditSavedQuery in) {
        requireAdmin(callerId, in.getWorkspaceId());
        in.setId("ASQ-" + shortId());
        in.setCreatedBy(callerId);
        in.setCreatedAt(OffsetDateTime.now());
        return savedQueries.save(in);
    }

    @Transactional
    public void deleteSavedQuery(String callerId, String id) {
        AuditSavedQuery q = savedQueries.findById(id).orElseThrow(() -> ApiException.notFound("AuditSavedQuery", id));
        requireAdmin(callerId, q.getWorkspaceId());
        savedQueries.delete(q);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
