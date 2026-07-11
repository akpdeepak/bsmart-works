package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.FieldVisibilityService;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class WorkItemReadService {

    static final String MEMBER_PROJECTS =
            "project_id IN (SELECT p.id FROM projects p "
                    + "JOIN workspace_members wm ON wm.workspace_id = p.workspace_id WHERE wm.user_id = ?)";

    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;
    private final ObjectMapper objectMapper;
    private final FieldVisibilityService fieldVisibility;

    public WorkItemReadService(JdbcTemplate jdbc, AuthenticatedUser authenticatedUser, ObjectMapper objectMapper,
                               FieldVisibilityService fieldVisibility) {
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
        this.objectMapper = objectMapper;
        this.fieldVisibility = fieldVisibility;
    }

    public ResponseEntity<List<WorkItem>> getAllWorkItems(String parentId, int page, int size) {
        String userId = authenticatedUser.id();
        int limit = Math.min(Math.max(size, 1), 500);
        int offset = Math.max(page, 0) * limit;
        List<WorkItem> items;
        long totalCount;
        if (parentId != null) {
            items = jdbc.query("SELECT * FROM work_items WHERE parent_id = ? AND deleted_at IS NULL "
                            + "AND " + MEMBER_PROJECTS + " ORDER BY created_at DESC LIMIT ? OFFSET ?",
                    this::mapRow, parentId, userId, limit, offset);
            Long cnt = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM work_items WHERE parent_id = ? AND deleted_at IS NULL "
                            + "AND " + MEMBER_PROJECTS,
                    Long.class, parentId, userId);
            totalCount = cnt != null ? cnt : 0L;
        } else {
            items = jdbc.query("SELECT * FROM work_items WHERE deleted_at IS NULL "
                            + "AND " + MEMBER_PROJECTS + " ORDER BY created_at DESC LIMIT ? OFFSET ?",
                    this::mapRow, userId, limit, offset);
            Long cnt = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM work_items WHERE deleted_at IS NULL AND " + MEMBER_PROJECTS,
                    Long.class, userId);
            totalCount = cnt != null ? cnt : 0L;
        }
        attachTagsBatch(items);
        attachFieldValuesBatch(items);
        attachStarred(items, userId);
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Total-Count", String.valueOf(totalCount));
        headers.set("X-Has-More", String.valueOf(totalCount > (long) offset + items.size()));
        headers.add("Access-Control-Expose-Headers", "X-Total-Count, X-Has-More");
        return ResponseEntity.ok().headers(headers).body(items);
    }

    public List<WorkItem> getTrash(int page, int size) {
        String userId = authenticatedUser.id();
        int limit = Math.min(Math.max(size, 1), 200);
        int offset = Math.max(page, 0) * limit;
        List<WorkItem> items = jdbc.query(
                "SELECT * FROM work_items WHERE deleted_at IS NOT NULL AND deleted_at > NOW() - INTERVAL '30 days' "
                        + "AND " + MEMBER_PROJECTS + " ORDER BY deleted_at DESC LIMIT ? OFFSET ?",
                this::mapRow, userId, limit, offset);
        attachTagsBatch(items);
        attachFieldValuesBatch(items);
        return items;
    }

    public WorkItem getWorkItem(String id) {
        String userId = authenticatedUser.id();
        List<WorkItem> items = jdbc.query(
                "SELECT * FROM work_items WHERE id = ? AND deleted_at IS NULL AND " + MEMBER_PROJECTS,
                this::mapRow, id, userId);
        if (items.isEmpty()) {
            throw ApiException.notFound("Work item", id);
        }
        attachTagsBatch(items);
        attachFieldValuesBatch(items);
        attachStarred(items, userId);
        return items.get(0);
    }

    public List<WorkItem> getStarred(int page, int size) {
        String userId = authenticatedUser.id();
        int limit = Math.min(Math.max(size, 1), 200);
        int offset = Math.max(page, 0) * limit;
        List<WorkItem> items = jdbc.query(
                "SELECT wi.* FROM work_items wi JOIN starred_items si ON si.work_item_id = wi.id "
                        + "WHERE si.user_id = ? AND wi.deleted_at IS NULL AND wi." + MEMBER_PROJECTS
                        + " ORDER BY si.created_at DESC LIMIT ? OFFSET ?",
                this::mapRow, userId, userId, limit, offset);
        attachTagsBatch(items);
        attachFieldValuesBatch(items);
        items.forEach(i -> i.setStarred(true));
        return items;
    }

    public List<WorkItem> search(String q) {
        String userId = authenticatedUser.id();
        if (q == null || q.isBlank()) {
            return List.of();
        }
        String sql = "SELECT wi.*, (CASE WHEN si.work_item_id IS NOT NULL THEN 1 ELSE 0 END) AS is_starred "
                + "FROM work_items wi LEFT JOIN starred_items si ON si.work_item_id = wi.id AND si.user_id = ? "
                + "WHERE wi.deleted_at IS NULL AND wi." + MEMBER_PROJECTS + " AND (wi.title ILIKE ? ESCAPE '\\' "
                + "OR wi.description ILIKE ? ESCAPE '\\' "
                + "OR EXISTS (SELECT 1 FROM comments c WHERE c.work_item_id = wi.id AND c.body ILIKE ? ESCAPE '\\')) "
                + "ORDER BY is_starred DESC, wi.created_at DESC LIMIT 20";
        String escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        String pattern = "%" + escaped + "%";
        List<WorkItem> items = jdbc.query(sql, (rs, row) -> {
            WorkItem w = mapRow(rs, row);
            try {
                w.setStarred(rs.getInt("is_starred") == 1);
            } catch (Exception ignored) {
            }
            return w;
        }, userId, userId, pattern, pattern, pattern);
        attachTagsBatch(items);
        attachFieldValuesBatch(items);
        return items;
    }

    public List<WorkItem> getBacklog(String projectId, int size) {
        String userId = authenticatedUser.id();
        int limit = Math.min(Math.max(size, 1), 1000);
        String sql = "SELECT * FROM work_items WHERE sprint_id IS NULL AND " + MEMBER_PROJECTS
                + (projectId != null ? " AND project_id = ?" : "")
                + " ORDER BY backlog_order ASC, created_at ASC LIMIT " + limit;
        return projectId != null
                ? jdbc.query(sql, this::mapRow, userId, projectId)
                : jdbc.query(sql, this::mapRow, userId);
    }

    public void reorderBacklog(List<Map<String, Object>> items) {
        String userId = authenticatedUser.id();
        items.forEach(item -> {
            int order = ((Number) item.get("order")).intValue();
            jdbc.update("UPDATE work_items SET backlog_order = ? WHERE id = ? AND " + MEMBER_PROJECTS,
                    order, item.get("id"), userId);
        });
    }

    WorkItem mapRow(ResultSet rs, int row) throws SQLException {
        WorkItem w = new WorkItem();
        w.setId(rs.getString("id"));
        w.setAutoId(rs.getString("auto_id"));
        w.setTitle(rs.getString("title"));
        w.setStatus(rs.getString("status"));
        w.setType(rs.getString("type"));
        w.setAssigneeId(rs.getString("assignee_id"));
        w.setSprintId(rs.getString("sprint_id"));
        w.setStoryPoints(rs.getObject("story_points") != null ? rs.getInt("story_points") : 0);
        w.setPriority(rs.getString("priority"));
        w.setDueDate(rs.getDate("due_date") != null ? rs.getDate("due_date").toLocalDate() : null);
        w.setStartDate(rs.getDate("start_date") != null ? rs.getDate("start_date").toLocalDate() : null);
        w.setProjectId(rs.getString("project_id"));
        w.setParentId(rs.getString("parent_id"));
        w.setAcceptanceCriteria(rs.getString("acceptance_criteria"));
        w.setVersion(rs.getObject("version") != null ? rs.getInt("version") : 0);
        w.setDescription(rs.getString("description"));
        try {
            java.sql.Timestamp sca = rs.getTimestamp("status_changed_at");
            w.setStatusChangedAt(sca != null ? sca.toInstant().atOffset(java.time.ZoneOffset.UTC) : null);
        } catch (Exception ignored) {
        }
        mapOptionalFields(rs, w);
        try {
            String cf = rs.getString("custom_fields");
            if (cf != null && !cf.isBlank()) {
                w.setCustomFields(objectMapper.readValue(cf, new TypeReference<Map<String, Object>>() {}));
            }
        } catch (Exception ignored) {
        }
        return w;
    }

    private void mapOptionalFields(ResultSet rs, WorkItem w) {
        try { w.setReporterId(rs.getString("reporter_id")); } catch (Exception ignored) {}
        try { w.setSeverity(rs.getString("severity")); } catch (Exception ignored) {}
        try { w.setEnvironmentDetail(rs.getString("environment_detail")); } catch (Exception ignored) {}
        try { w.setBusinessImpact(rs.getString("business_impact")); } catch (Exception ignored) {}
        try { w.setResponseSpeed(rs.getString("response_speed")); } catch (Exception ignored) {}
        try { w.setRespondingTeam(rs.getString("responding_team")); } catch (Exception ignored) {}
        try { w.setResolutionType(rs.getString("resolution_type")); } catch (Exception ignored) {}
        try { w.setRootCause(rs.getString("root_cause")); } catch (Exception ignored) {}
        try { w.setProbability(rs.getString("probability")); } catch (Exception ignored) {}
        try { w.setImpactLevel(rs.getString("impact_level")); } catch (Exception ignored) {}
        try { w.setRiskScore(rs.getObject("risk_score") != null ? rs.getShort("risk_score") : null); } catch (Exception ignored) {}
        try { w.setDependencyType(rs.getString("dependency_type")); } catch (Exception ignored) {}
        try { w.setSourceItemId(rs.getString("source_item_id")); } catch (Exception ignored) {}
        try { w.setTargetItemId(rs.getString("target_item_id")); } catch (Exception ignored) {}
        try { w.setApproverId(rs.getString("approver_id")); } catch (Exception ignored) {}
        try { w.setRequestedForId(rs.getString("requested_for_id")); } catch (Exception ignored) {}
        try {
            var nd = rs.getDate("needed_by_date");
            w.setNeededByDate(nd != null ? nd.toLocalDate() : null);
        } catch (Exception ignored) {}
        try { w.setItemCategory(rs.getString("item_category")); } catch (Exception ignored) {}
        try { w.setSubArea(rs.getString("sub_area")); } catch (Exception ignored) {}
        try { w.setDepartment(rs.getString("department")); } catch (Exception ignored) {}
        try { w.setRegressionRisk(rs.getString("regression_risk")); } catch (Exception ignored) {}
        try { w.setStepsToReproduce(rs.getString("steps_to_reproduce")); } catch (Exception ignored) {}
        try { w.setExpectedBehavior(rs.getString("expected_behavior")); } catch (Exception ignored) {}
        try { w.setActualBehavior(rs.getString("actual_behavior")); } catch (Exception ignored) {}
        try { w.setAffectedVersion(rs.getString("affected_version")); } catch (Exception ignored) {}
        try { w.setFixedInVersion(rs.getString("fixed_in_version")); } catch (Exception ignored) {}
        try { w.setFixDescription(rs.getString("fix_description")); } catch (Exception ignored) {}
        try { w.setMitigationPlan(rs.getString("mitigation_plan")); } catch (Exception ignored) {}
        try { w.setContingencyPlan(rs.getString("contingency_plan")); } catch (Exception ignored) {}
        try { w.setBasisRationale(rs.getString("basis_rationale")); } catch (Exception ignored) {}
        try {
            var vd = rs.getDate("validation_date");
            w.setValidationDate(vd != null ? vd.toLocalDate() : null);
        } catch (Exception ignored) {}
        try { w.setRiskIfWrong(rs.getString("risk_if_wrong")); } catch (Exception ignored) {}
        try { w.setImpactIfDelayed(rs.getString("impact_if_delayed")); } catch (Exception ignored) {}
        try {
            var erd = rs.getDate("expected_resolution_date");
            w.setExpectedResolutionDate(erd != null ? erd.toLocalDate() : null);
        } catch (Exception ignored) {}
        try { w.setBusinessJustification(rs.getString("business_justification")); } catch (Exception ignored) {}
        try { w.setAffectedSystem(rs.getString("affected_system")); } catch (Exception ignored) {}
        try { w.setBusinessService(rs.getString("business_service")); } catch (Exception ignored) {}
        try { w.setResolutionSummary(rs.getString("resolution_summary")); } catch (Exception ignored) {}
        try { w.setClosureNotes(rs.getString("closure_notes")); } catch (Exception ignored) {}
        try { w.setStakeholderUpdate(rs.getString("stakeholder_update")); } catch (Exception ignored) {}
        try { w.setSlaBreachFlag(rs.getBoolean("sla_breach_flag")); } catch (Exception ignored) {}
        try { w.setProductId(rs.getString("product_id")); } catch (Exception ignored) {}
    }

    void attachStarred(List<WorkItem> items, String userId) {
        if (items.isEmpty()) return;
        List<String> starredIds = jdbc.queryForList(
                "SELECT work_item_id FROM starred_items WHERE user_id = ?", String.class, userId);
        java.util.Set<String> starredSet = new java.util.HashSet<>(starredIds);
        items.forEach(i -> i.setStarred(starredSet.contains(i.getId())));
    }

    void attachTags(WorkItem item) {
        List<String> tags = jdbc.queryForList(
                "SELECT tag FROM tags WHERE work_item_id = ? ORDER BY id", String.class, item.getId());
        item.setTags(tags);
    }

    void attachTagsBatch(List<WorkItem> items) {
        if (items.isEmpty()) return;
        List<String> ids = items.stream().map(WorkItem::getId).toList();
        String placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        java.util.Map<String, List<String>> tagsByItem = new java.util.HashMap<>();
        jdbc.query(
                "SELECT work_item_id, tag FROM tags WHERE work_item_id IN (" + placeholders + ") ORDER BY id",
                (org.springframework.jdbc.core.RowCallbackHandler) rs ->
                        tagsByItem.computeIfAbsent(rs.getString("work_item_id"),
                                k -> new java.util.ArrayList<>()).add(rs.getString("tag")),
                ids.toArray());
        items.forEach(i -> i.setTags(tagsByItem.getOrDefault(i.getId(), new java.util.ArrayList<>())));
    }

    void attachFieldValuesBatch(List<WorkItem> items) {
        if (items.isEmpty()) return;
        List<String> ids = items.stream().map(WorkItem::getId).toList();
        String placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        java.util.Map<String, java.util.Map<String, Object>> byItem = new java.util.HashMap<>();
        jdbc.query(
                "SELECT work_item_id, field_def_id, value_text, value_number, value_json #>> '{}' AS value_json_text "
                        + "FROM work_item_field_value WHERE work_item_id IN (" + placeholders + ")",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> {
                    Object v = rs.getString("value_text");
                    if (v == null) {
                        Object n = rs.getObject("value_number");
                        v = n != null ? n.toString() : null;
                    }
                    if (v == null) v = rs.getString("value_json_text");
                    byItem.computeIfAbsent(rs.getString("work_item_id"), k -> new java.util.HashMap<>())
                            .put(rs.getString("field_def_id"), v);
                },
                ids.toArray());
        redactHiddenFieldValues(items, byItem);
        items.forEach(i -> i.setFieldValues(byItem.getOrDefault(i.getId(), new java.util.HashMap<>())));
    }

    /**
     * Field-level security read redaction (RB-40 §1; EPIC P1 §3.2) — the single choke point.
     *
     * <p>Strips field_def values the caller's role-tier must NOT see (an explicit {@code HIDDEN} rule
     * in that field's workspace) from BOTH the {@code work_item_field_value} map and the legacy
     * {@code custom_fields} JSONB (post-V80 its keys are field_def ids too, so it leaks the same way).
     * Because a batch can span multiple workspaces (search / my / starred), the
     * verdict is resolved <b>per item's workspace</b> and memoized for the request, so the cost is
     * O(distinct-workspaces-in-batch), not O(items) — no N+1.
     *
     * <p>Conservative posture (EPIC P1 §4): only an explicit HIDDEN rule redacts; everything else
     * (no rule → EDITABLE, or READ_ONLY) is returned unchanged. READ_ONLY values still render — they
     * are simply not writable (enforced on the write path).
     */
    private void redactHiddenFieldValues(List<WorkItem> items,
                                         java.util.Map<String, java.util.Map<String, Object>> byItem) {
        // Run if EITHER store has data: the work_item_field_value map (byItem) OR the legacy
        // custom_fields JSONB already mapped onto an item — legacy-only items have an empty byItem.
        boolean anyCustom = items.stream()
                .anyMatch(i -> i.getCustomFields() != null && !i.getCustomFields().isEmpty());
        if (byItem.isEmpty() && !anyCustom) return; // nothing on any item to redact
        String userId = authenticatedUser.id();
        java.util.Map<String, String> wsByItem = workspaceByItem(items);
        // Memoize the HIDDEN set per distinct workspace for this request (no cross-request caching:
        // rules can change, a stale cache would be a security risk).
        java.util.Map<String, Set<String>> hiddenByWorkspace = new java.util.HashMap<>();
        for (WorkItem item : items) {
            java.util.Map<String, Object> values = byItem.get(item.getId());
            java.util.Map<String, Object> custom = item.getCustomFields();
            boolean hasValues = values != null && !values.isEmpty();
            boolean hasCustom = custom != null && !custom.isEmpty();
            if (!hasValues && !hasCustom) continue;
            String wsId = wsByItem.get(item.getId());
            if (wsId == null) continue; // unknown workspace → already bounded by upstream tenant scope
            Set<String> hidden = hiddenByWorkspace.computeIfAbsent(wsId,
                    ws -> fieldVisibility.resolveForUser(userId, ws).hiddenFieldDefIds());
            if (hidden.isEmpty()) continue;
            if (hasValues) values.keySet().removeAll(hidden);
            if (hasCustom) custom.keySet().removeAll(hidden); // close the legacy JSONB leak too
        }
    }

    /** Batch-resolve each item's workspace via its project (one indexed query for the whole batch). */
    private java.util.Map<String, String> workspaceByItem(List<WorkItem> items) {
        List<String> ids = items.stream().map(WorkItem::getId).toList();
        String placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        java.util.Map<String, String> wsByItem = new java.util.HashMap<>();
        jdbc.query(
                "SELECT wi.id, p.workspace_id FROM work_items wi "
                        + "JOIN projects p ON p.id = wi.project_id WHERE wi.id IN (" + placeholders + ")",
                (org.springframework.jdbc.core.RowCallbackHandler) rs ->
                        wsByItem.put(rs.getString("id"), rs.getString("workspace_id")),
                ids.toArray());
        return wsByItem;
    }
}
