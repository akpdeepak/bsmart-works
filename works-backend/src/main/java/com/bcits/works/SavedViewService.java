package com.bcits.works;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.BqlContext;
import com.bcits.works.shared.BqlException;

import com.bcits.works.shared.BqlContextFactory;
import com.bcits.works.shared.BqlExecutionService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Saved views — named BQL-filter + column configuration stored per workspace (iteration 17, Cap R).
 * A view is the complement to a saved BQL filter: it captures not just the query but also which
 * columns to display. Views are workspace-scoped (RB-40 §1); creating/updating requires
 * {@code manage_projects} (RB-10 §2). Any workspace member may read shared views.
 */
@Service
public class SavedViewService {

    /** Strips a trailing JQL-style {@code ORDER BY …} so the predicate compiles on its own. */
    private static final Pattern ORDER_BY = Pattern.compile("(?i)\\s+ORDER\\s+BY\\s+.+$");

    private final SavedViewRepository views;
    private final RbacService rbac;
    private final BqlExecutionService execution;
    private final BqlContextFactory contextFactory;
    private final BqlRunAuditService runAudit;

    public SavedViewService(SavedViewRepository views, RbacService rbac,
                            BqlExecutionService execution, BqlContextFactory contextFactory,
                            BqlRunAuditService runAudit) {
        this.views = views;
        this.rbac = rbac;
        this.execution = execution;
        this.contextFactory = contextFactory;
        this.runAudit = runAudit;
    }

    public List<SavedView> list(String callerId, String workspaceId, String projectId) {
        rbac.require(callerId, workspaceId, "view_items");
        if (projectId != null && !projectId.isBlank()) {
            return views.findByWorkspaceIdAndProjectIdAndDeletedAtIsNullOrderByDisplayOrderAscNameAsc(workspaceId, projectId);
        }
        return views.findByWorkspaceIdAndDeletedAtIsNullOrderByDisplayOrderAscNameAsc(workspaceId);
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
        view.setDisplayOrder(views.maxDisplayOrder(workspaceId) + 1);
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
        if (patch.getDisplayOrder() != null) existing.setDisplayOrder(patch.getDisplayOrder());
        if (patch.getProjectId() != null) existing.setProjectId(patch.getProjectId());
        if (patch.getItemType() != null) existing.setItemType(patch.getItemType());
        existing.setUpdatedAt(OffsetDateTime.now());
        return views.save(existing);
    }

    /**
     * Run a saved view's BQL server-side and return the matching rows — workspace-scoped and
     * field-secured via the caller's {@link BqlContext}. Unlike ad-hoc {@code /bql/execute}, a
     * saved-view run is an audited, named run (RB-20 §5): each call appends a {@link BqlRunAudit}
     * row recording who ran which view and how many rows currently match.
     */
    public List<Map<String, Object>> run(String callerId, String workspaceId, String id, int size) {
        rbac.require(callerId, workspaceId, "view_items");
        SavedView view = require(workspaceId, id);
        String query = stripOrderBy(view.getBqlFilter());
        BqlContext ctx = contextFactory.forUser(callerId, workspaceId);
        int clamped = Math.max(1, Math.min(size, 500));
        try {
            int total = execution.count(workspaceId, ctx, query);
            List<Map<String, Object>> rows =
                execution.execute(workspaceId, ctx, query, "created_at DESC", clamped, 0);
            runAudit.record(workspaceId, callerId, BqlRunAudit.Source.SAVED_VIEW,
                id, view.getBqlFilter(), total);
            return rows;
        } catch (BqlException e) {
            throw ApiException.badRequest("BQL_PARSE_ERROR", "This view's query is invalid: " + e.getMessage());
        }
    }

    /** Read the workspace's saved/automated-run audit log (newest first). Admin-gated. */
    public List<BqlRunAudit> auditLog(String callerId, String workspaceId, int limit) {
        return runAudit.list(callerId, workspaceId, limit);
    }

    private static String stripOrderBy(String bql) {
        return bql == null ? "" : ORDER_BY.matcher(bql).replaceAll("").trim();
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
