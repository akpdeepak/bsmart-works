package com.bcits.works;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Applies a single field change to many work items in one request — the bulk-edit companion to the
 * BQL navigator (select rows → change assignee/priority/labels at once).
 *
 * <p>Governance (decision: bulk edit is open to anyone with edit rights, re-checked per item and
 * audited):
 * <ul>
 *   <li><b>Per-item RBAC</b> — every item is re-checked with {@link RbacService#canEdit}; an item
 *       the caller may not edit (including one in another workspace) is <b>skipped</b>, never
 *       mutated. This is also the tenant guard: {@code canEdit} resolves the item's own workspace,
 *       so a caller can only ever change items in workspaces they belong to (RB-40 §1).</li>
 *   <li><b>Audited</b> — each applied change emits a per-field diff to the append-only event store
 *       via {@link EventService#recordDiff}, exactly as the single-item update path does, so a bulk
 *       edit is as reconstructable as an individual one (RB-20 §5).</li>
 * </ul>
 *
 * <p>Partial success is the contract: items are processed independently and the result reports what
 * changed and what was skipped (with a reason), so one un-editable item never fails the batch.
 * Status is deliberately <b>not</b> a bulk field — a status change must run the DoD gate and the
 * workflow rule engine per item (see {@code WorkItemController.updateWorkItem}); bulk-shortcutting
 * those would be unsafe.
 */
@Service
public class WorkItemBulkService {

    /** The fields a bulk edit may set. Closed set — anything else is rejected before any write. */
    private static final java.util.Set<String> ACTIONS =
        java.util.Set.of("assignee", "priority", "addlabel", "removelabel");

    private final WorkItemRepository repository;
    private final RbacService rbac;
    private final EventService eventService;
    private final JdbcTemplate jdbc;

    public WorkItemBulkService(WorkItemRepository repository, RbacService rbac,
                               EventService eventService, JdbcTemplate jdbc) {
        this.repository = repository;
        this.rbac = rbac;
        this.eventService = eventService;
        this.jdbc = jdbc;
    }

    /** Outcome of a bulk edit: which ids changed, and which were skipped and why. */
    public record BulkResult(int requested, List<String> updated, List<Map<String, String>> skipped) { }

    /**
     * Apply {@code action}={@code value} to each of {@code ids}, skipping any the caller may not
     * edit. Returns a per-item outcome; never throws on an individual item.
     *
     * @throws ApiException if the action is unknown or the value is missing where required
     */
    public BulkResult apply(String userId, List<String> ids, String action, String value) {
        String act = action == null ? "" : action.trim().toLowerCase(Locale.ROOT);
        if (!ACTIONS.contains(act)) {
            throw ApiException.badRequest("BULK_ACTION_INVALID",
                "Unknown bulk action. Supported: assignee, priority, addLabel, removeLabel.");
        }
        boolean valueRequired = !act.equals("assignee"); // assignee may be blank = unassign
        if (valueRequired && (value == null || value.isBlank())) {
            throw ApiException.badRequest("BULK_VALUE_REQUIRED", "A value is required for " + action + ".");
        }
        List<String> updated = new ArrayList<>();
        List<Map<String, String>> skipped = new ArrayList<>();
        for (String id : ids == null ? List.<String>of() : ids) {
            try {
                applyOne(userId, id, act, value, updated, skipped);
            } catch (RuntimeException e) {
                skip(skipped, id, "error");
            }
        }
        return new BulkResult(ids == null ? 0 : ids.size(), updated, skipped);
    }

    private void applyOne(String userId, String id, String act, String value,
                          List<String> updated, List<Map<String, String>> skipped) {
        WorkItem item = repository.findById(id).orElse(null);
        if (item == null) {
            skip(skipped, id, "not_found");
            return;
        }
        String wsId = rbac.workspaceForProject(item.getProjectId());
        // Per-item edit re-check — also the tenant guard (canEdit resolves the item's own workspace).
        if (wsId != null && !rbac.canEdit(userId, wsId, item.getCreatedBy(), item.getAssigneeId())) {
            skip(skipped, id, "forbidden");
            return;
        }
        switch (act) {
            case "assignee" -> {
                String old = item.getAssigneeId();
                String next = value == null || value.isBlank() ? null : value.trim();
                if (!java.util.Objects.equals(old, next)) {
                    item.setAssigneeId(next);
                    repository.save(item);
                    eventService.recordDiff(id, "ASSIGNED", userId, "assignee", old, next);
                }
            }
            case "priority" -> {
                String old = item.getPriority();
                if (!java.util.Objects.equals(old, value)) {
                    item.setPriority(value);
                    repository.save(item);
                    eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "priority", old, value);
                }
            }
            case "addlabel" -> {
                Integer exists = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM tags WHERE work_item_id = ? AND tag = ?", Integer.class, id, value);
                if (exists == null || exists == 0) {
                    jdbc.update("INSERT INTO tags (work_item_id, tag) VALUES (?, ?)", id, value);
                    eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "tags", null, value);
                }
            }
            case "removelabel" -> {
                int n = jdbc.update("DELETE FROM tags WHERE work_item_id = ? AND tag = ?", id, value);
                if (n > 0) {
                    eventService.recordDiff(id, "WORK_ITEM_UPDATED", userId, "tags", value, null);
                }
            }
            default -> { /* unreachable — guarded by ACTIONS above */ }
        }
        updated.add(id);
    }

    private void skip(List<Map<String, String>> skipped, String id, String reason) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("reason", reason);
        skipped.add(m);
    }
}
