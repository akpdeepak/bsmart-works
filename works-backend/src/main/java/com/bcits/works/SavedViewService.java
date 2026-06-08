package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Saved views — named BQL-filter + column configuration stored per workspace (iteration 17, Cap R).
 * A view is the complement to a saved BQL filter: it captures not just the query but also which
 * columns to display. Views are workspace-scoped (RB-40 §1); creating/updating requires
 * {@code manage_projects} (RB-10 §2). Any workspace member may read shared views.
 */
@Service
public class SavedViewService {

    private final SavedViewRepository views;
    private final RbacService rbac;

    public SavedViewService(SavedViewRepository views, RbacService rbac) {
        this.views = views;
        this.rbac = rbac;
    }

    public List<SavedView> list(String callerId, String workspaceId, String projectId) {
        rbac.require(callerId, workspaceId, "view_items");
        if (projectId != null && !projectId.isBlank()) {
            return views.findByWorkspaceIdAndProjectIdAndDeletedAtIsNullOrderByNameAsc(workspaceId, projectId);
        }
        return views.findByWorkspaceIdAndDeletedAtIsNullOrderByNameAsc(workspaceId);
    }

    @Transactional
    public SavedView create(String callerId, String workspaceId, SavedView view) {
        rbac.require(callerId, workspaceId, "manage_projects");
        if (view.getName() == null || view.getName().isBlank()) {
            throw ApiException.badRequest("MISSING_NAME", "View name is required.", "name");
        }
        OffsetDateTime now = OffsetDateTime.now();
        view.setId("VIEW-" + shortId());
        view.setWorkspaceId(workspaceId);
        view.setCreatedBy(callerId);
        view.setCreatedAt(now);
        view.setUpdatedAt(now);
        if (view.getIsShared() == null) view.setIsShared(false);
        if (view.getColumnKeys() == null || view.getColumnKeys().isBlank()) view.setColumnKeys("[]");
        return views.save(view);
    }

    @Transactional
    public SavedView update(String callerId, String workspaceId, String id, SavedView patch) {
        rbac.require(callerId, workspaceId, "manage_projects");
        SavedView existing = require(workspaceId, id);
        if (patch.getName() != null && !patch.getName().isBlank()) existing.setName(patch.getName());
        if (patch.getDescription() != null) existing.setDescription(patch.getDescription());
        if (patch.getBqlFilter() != null) existing.setBqlFilter(patch.getBqlFilter());
        if (patch.getColumnKeys() != null) existing.setColumnKeys(patch.getColumnKeys());
        if (patch.getIsShared() != null) existing.setIsShared(patch.getIsShared());
        if (patch.getProjectId() != null) existing.setProjectId(patch.getProjectId());
        if (patch.getItemType() != null) existing.setItemType(patch.getItemType());
        existing.setUpdatedAt(OffsetDateTime.now());
        return views.save(existing);
    }

    @Transactional
    public void delete(String callerId, String workspaceId, String id) {
        rbac.require(callerId, workspaceId, "manage_projects");
        SavedView v = require(workspaceId, id);
        v.setDeletedAt(OffsetDateTime.now());
        views.save(v);
    }

    // ── Pure helpers (RB-10 §7) ────────────────────────────────────────────────

    SavedView require(String workspaceId, String id) {
        SavedView v = views.findById(id).orElseThrow(() -> ApiException.notFound("Saved view", id));
        if (!workspaceId.equals(v.getWorkspaceId())) {
            throw ApiException.forbidden("View belongs to a different workspace.");
        }
        if (v.getDeletedAt() != null) {
            throw ApiException.notFound("Saved view", id);
        }
        return v;
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
