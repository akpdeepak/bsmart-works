package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Definition-of-Done checklists (Cap U, iteration 14). A checklist is scoped to a work item type or
 * an epic; required items must be complete before a work item may move to a done-category status.
 * Authoring is admin-gated ({@code manage_projects}); toggling an item respects the same edit RBAC
 * as the work item itself (RB-10 §2). Workspace-scoped throughout (RB-40 §1).
 */
@Service
public class DodChecklistService {

    private final DodChecklistRepository checklists;
    private final DodChecklistItemRepository items;
    private final DodChecklistStateRepository states;
    private final WorkItemRepository workItems;
    private final RbacGate rbac;
    private final EventService events;

    public DodChecklistService(DodChecklistRepository checklists, DodChecklistItemRepository items,
                               DodChecklistStateRepository states, WorkItemRepository workItems,
                               RbacGate rbac, EventService events) {
        this.checklists = checklists;
        this.items = items;
        this.states = states;
        this.workItems = workItems;
        this.rbac = rbac;
        this.events = events;
    }

    /** Pure rule: which status names count as "done" for gating. Static so it is unit-testable. */
    public static boolean isDoneStatus(String status) {
        if (status == null) return false;
        String s = status.toLowerCase(Locale.ROOT);
        return s.contains("done") || s.contains("resolved") || s.contains("closed") || s.contains("complete");
    }

    // ── Authoring (admin) ────────────────────────────────────────────────────────

    public List<Map<String, Object>> list(String workspaceId, String userId) {
        rbac.require(userId, workspaceId, "view_items");
        List<Map<String, Object>> out = new ArrayList<>();
        for (DodChecklist c : checklists.findByWorkspaceIdOrderByName(workspaceId)) {
            out.add(toMap(c, items.findByChecklistIdOrderByPosition(c.getId())));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> create(String workspaceId, String userId, String scopeType, String scopeRef,
                                      String name, List<Map<String, Object>> rawItems) {
        rbac.require(userId, workspaceId, "manage_projects");
        if (scopeType == null || (!scopeType.equals("TYPE") && !scopeType.equals("EPIC"))) {
            throw ApiException.badRequest("INVALID_SCOPE", "scopeType must be TYPE or EPIC.");
        }
        if (scopeRef == null || scopeRef.isBlank()) {
            throw ApiException.badRequest("INVALID_SCOPE_REF", "scopeRef is required.");
        }
        checklists.findByWorkspaceIdAndScopeTypeAndScopeRef(workspaceId, scopeType, scopeRef).ifPresent(c -> {
            throw ApiException.conflict("A Definition-of-Done checklist already exists for that scope.");
        });
        DodChecklist c = new DodChecklist();
        c.setId("DOD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
        c.setWorkspaceId(workspaceId);
        c.setScopeType(scopeType);
        c.setScopeRef(scopeRef);
        c.setName(name == null || name.isBlank() ? scopeRef + " Definition of Done" : name.trim());
        c.setCreatedAt(OffsetDateTime.now());
        checklists.save(c);
        int pos = 0;
        for (Map<String, Object> ri : rawItems == null ? List.<Map<String, Object>>of() : rawItems) {
            String label = ri.get("label") == null ? null : ri.get("label").toString();
            if (label == null || label.isBlank()) continue;
            DodChecklistItem it = new DodChecklistItem();
            it.setChecklistId(c.getId());
            it.setLabel(label.trim());
            it.setPosition(pos++);
            Object req = ri.get("required");
            it.setRequired(!(req instanceof Boolean b) || b);
            items.save(it);
        }
        events.recordInWorkspace(workspaceId, c.getId(), "dod_checklist.created", userId,
            Map.of("scopeType", scopeType, "scopeRef", scopeRef));
        return toMap(c, items.findByChecklistIdOrderByPosition(c.getId()));
    }

    @Transactional
    public void delete(String workspaceId, String userId, String checklistId) {
        rbac.require(userId, workspaceId, "manage_projects");
        DodChecklist c = checklists.findById(checklistId)
            .orElseThrow(() -> ApiException.notFound("DodChecklist", checklistId));
        if (!workspaceId.equals(c.getWorkspaceId())) {            // cross-tenant guard (RB-40 §1)
            throw ApiException.notFound("DodChecklist", checklistId);
        }
        checklists.delete(c);
        events.recordInWorkspace(workspaceId, checklistId, "dod_checklist.deleted", userId, Map.of());
    }

    // ── Effective checklist for a work item ───────────────────────────────────────

    /** The checklist that applies to a work item: an EPIC-scoped one on its parent epic wins,
     *  otherwise the TYPE-scoped one for its type. Returns the items with this item's check state. */
    public Map<String, Object> forWorkItem(String workItemId, String callerId) {
        WorkItem wi = workItems.findById(workItemId)
            .orElseThrow(() -> ApiException.notFound("Work item", workItemId));
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId != null) rbac.require(callerId, wsId, "view_items");

        Optional<DodChecklist> chosen = Optional.empty();
        if (wi.getParentId() != null && !wi.getParentId().isBlank()) {
            chosen = checklists.findByWorkspaceIdAndScopeTypeAndScopeRef(wsId, "EPIC", wi.getParentId());
        }
        if (chosen.isEmpty() && wi.getType() != null) {
            chosen = checklists.findByWorkspaceIdAndScopeTypeAndScopeRef(wsId, "TYPE", wi.getType());
        }
        if (chosen.isEmpty()) {
            Map<String, Object> none = new java.util.LinkedHashMap<>();
            none.put("workItemId", workItemId);
            none.put("checklist", null);
            none.put("items", List.of());
            none.put("requiredOutstanding", 0);
            none.put("complete", true);
            return none;
        }
        DodChecklist c = chosen.get();
        List<DodChecklistItem> defs = items.findByChecklistIdOrderByPosition(c.getId());
        List<DodChecklistState> st = states.findByWorkItemId(workItemId);
        List<Map<String, Object>> rows = new ArrayList<>();
        int requiredOutstanding = 0;
        for (DodChecklistItem def : defs) {
            DodChecklistState s = st.stream()
                .filter(x -> x.getChecklistItemId().equals(def.getId())).findFirst().orElse(null);
            boolean checked = s != null && s.isChecked();
            if (def.isRequired() && !checked) requiredOutstanding++;
            Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("itemId", def.getId());
            row.put("label", def.getLabel());
            row.put("required", def.isRequired());
            row.put("checked", checked);
            row.put("checkedBy", s == null ? null : s.getCheckedBy());
            row.put("checkedAt", s == null ? null : s.getCheckedAt());
            rows.add(row);
        }
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("workItemId", workItemId);
        Map<String, Object> meta = new java.util.LinkedHashMap<>();
        meta.put("id", c.getId());
        meta.put("name", c.getName());
        meta.put("scopeType", c.getScopeType());
        meta.put("scopeRef", c.getScopeRef());
        out.put("checklist", meta);
        out.put("items", rows);
        out.put("requiredOutstanding", requiredOutstanding);
        out.put("complete", requiredOutstanding == 0);
        return out;
    }

    @Transactional
    public Map<String, Object> toggle(String workItemId, Long itemId, boolean checked, String callerId) {
        WorkItem wi = workItems.findById(workItemId)
            .orElseThrow(() -> ApiException.notFound("Work item", workItemId));
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId != null && !rbac.canEdit(callerId, wsId, wi.getCreatedBy(), wi.getAssigneeId())) {
            throw ApiException.forbidden("You do not have permission to update this checklist.");
        }
        DodChecklistItem def = items.findById(itemId)
            .orElseThrow(() -> ApiException.notFound("DodChecklistItem", String.valueOf(itemId)));
        DodChecklistState s = states.findByWorkItemIdAndChecklistItemId(workItemId, itemId)
            .orElseGet(() -> {
                DodChecklistState fresh = new DodChecklistState();
                fresh.setWorkItemId(workItemId);
                fresh.setChecklistItemId(itemId);
                return fresh;
            });
        s.setChecked(checked);
        s.setCheckedBy(checked ? callerId : null);
        s.setCheckedAt(checked ? OffsetDateTime.now() : null);
        states.save(s);
        events.recordInWorkspace(wsId, workItemId, "dod_item.toggled", callerId,
            Map.of("item", def.getLabel(), "checked", checked));
        return forWorkItem(workItemId, callerId);
    }

    // ── Resolution gate ───────────────────────────────────────────────────────────

    /** Throws 409 if the work item has any required DoD item unchecked. Called from the work-item
     *  status-transition path before a move into a done-category status. */
    @SuppressWarnings("unchecked")
    public void assertResolvable(String workItemId, String callerId) {
        Map<String, Object> eff = forWorkItem(workItemId, callerId);
        if (Boolean.TRUE.equals(eff.get("complete"))) return;
        List<Map<String, Object>> rows = (List<Map<String, Object>>) eff.get("items");
        List<String> outstanding = rows.stream()
            .filter(r -> Boolean.TRUE.equals(r.get("required")) && !Boolean.TRUE.equals(r.get("checked")))
            .map(r -> String.valueOf(r.get("label")))
            .toList();
        throw ApiException.conflict("Definition of Done not met — complete: " + String.join("; ", outstanding));
    }

    private static Map<String, Object> toMap(DodChecklist c, List<DodChecklistItem> defs) {
        List<Map<String, Object>> rows = defs.stream().map(d -> Map.<String, Object>of(
            "itemId", d.getId(), "label", d.getLabel(), "position", d.getPosition(), "required", d.isRequired()
        )).toList();
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("name", c.getName());
        m.put("scopeType", c.getScopeType());
        m.put("scopeRef", c.getScopeRef());
        m.put("items", rows);
        return m;
    }
}
