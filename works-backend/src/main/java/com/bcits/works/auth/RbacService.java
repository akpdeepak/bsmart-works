package com.bcits.works.auth;

import com.bcits.works.CurrentWorkspace;
import com.bcits.works.TenantFilterSettings;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.RbacGate;
import com.bcits.works.shared.TenantContext;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * Role-based access control service — the single implementation of {@link RbacGate}.
 * Tier hierarchy: VIEWER(1) < MEMBER(2) < LEAD(3) < ADMIN(4) < OWNER(5)
 * All permission checks go through here — never in controllers.
 */
@Service
public class RbacService implements RbacGate {

    private final JdbcTemplate jdbc;
    private final CurrentWorkspace currentWorkspace;
    private final TenantFilterSettings tenantFilterSettings;

    public RbacService(JdbcTemplate jdbc, CurrentWorkspace currentWorkspace,
                       TenantFilterSettings tenantFilterSettings) {
        this.jdbc = jdbc;
        this.currentWorkspace = currentWorkspace;
        this.tenantFilterSettings = tenantFilterSettings;
    }

    // ── Tier lookup ──────────────────────────────────────────────────────────

    public int getUserTier(String userId, String workspaceId) {
        try {
            int tier = jdbc.queryForObject(
                "SELECT r.tier FROM workspace_members wm " +
                "JOIN roles r ON r.id = wm.role_id " +
                "WHERE wm.user_id = ? AND wm.workspace_id = ?",
                Integer.class, userId, workspaceId);
            // Central tenant-filter binding (RB-40 §1, #243 Slice A). A successful member-tier lookup
            // is the one app-wide signal that the caller is authorized to act in this *single*
            // workspace — every single-workspace-authorized path funnels through here (directly, or
            // via canDo/require/canView/isAdmin). Binding the central Hibernate workspaceFilter to it
            // makes the filter the central backstop behind the explicit per-query predicates, extended
            // from ProjectService-only to every such path. Flag-gated (default off) so merging changes
            // no runtime behaviour; additive — it can only ever narrow a read to workspaceId, never
            // widen one. Multi-workspace reads (work-item lists, /my, findAllScopedToUser…) never reach
            // a single-workspace tier check, so they stay unbound and keep their membership-join scope.
            if (tier >= 1) {
                bindCentralFilterIfEnabled(workspaceId);
            }
            return tier;
        } catch (Exception e) {
            return 0; // not a member
        }
    }

    /**
     * Bind {@code workspaceId} to the central tenant filter (#243 Slice A), when and only when:
     * the binding rollout flag is on, a real workspace was resolved, and we are not inside the
     * {@link TenantScope} system/unscoped escape hatch (a scheduler/admin sweep that probes a tier
     * must not re-narrow its deliberately cross-workspace read). No-op otherwise — including the
     * default-off path, which is what keeps this slice inert on merge.
     */
    private void bindCentralFilterIfEnabled(String workspaceId) {
        if (tenantFilterSettings.isBindingEnabled()
                && workspaceId != null && !workspaceId.isBlank()
                && !TenantContext.isSystem()) {
            currentWorkspace.bind(workspaceId);
        }
    }

    public String getUserRole(String userId, String workspaceId) {
        try {
            return jdbc.queryForObject(
                "SELECT wm.role_id FROM workspace_members wm WHERE wm.user_id = ? AND wm.workspace_id = ?",
                String.class, userId, workspaceId);
        } catch (Exception e) {
            return "NONE";
        }
    }

    // ── Permission check ─────────────────────────────────────────────────────

    public boolean canDo(String userId, String workspaceId, String permission) {
        try {
            Integer minTier = jdbc.queryForObject(
                "SELECT min_tier FROM permissions WHERE id = ?", Integer.class, permission);
            if (minTier == null) return false; {
            return getUserTier(userId, workspaceId) >= minTier;
            }
        } catch (Exception e) {
            return false;
        }
    }

    /** Throw 403 ApiException if the user lacks the given permission. */
    public void require(String userId, String workspaceId, String permission) {
        if (!canDo(userId, workspaceId, permission)) {
            throw ApiException.forbidden("You do not have permission to perform this action.");
        }
    }

    // ── Workspace ID resolution ───────────────────────────────────────────────

    /** Look up workspaceId from a project. Returns null if project doesn't exist. */
    public String workspaceForProject(String projectId) {
        try {
            return jdbc.queryForObject(
                "SELECT workspace_id FROM projects WHERE id = ?", String.class, projectId);
        } catch (Exception e) {
            return null;
        }
    }

    /** Look up workspaceId from a work item (via its project). */
    public String workspaceForWorkItem(String workItemId) {
        try {
            return jdbc.queryForObject(
                "SELECT p.workspace_id FROM work_items wi " +
                "JOIN projects p ON p.id = wi.project_id WHERE wi.id = ?",
                String.class, workItemId);
        } catch (Exception e) {
            return null;
        }
    }

    // ── Convenience check + throw combos ─────────────────────────────────────

    public boolean canView(String userId, String wsId)           { return canDo(userId, wsId, "view_items"); }
    public boolean canCreateItems(String userId, String wsId)    { return canDo(userId, wsId, "create_items"); }
    public boolean canEditAny(String userId, String wsId)        { return canDo(userId, wsId, "edit_any_item"); }
    public boolean canDeleteItems(String userId, String wsId)    { return canDo(userId, wsId, "delete_items"); }
    public boolean canManageSprints(String userId, String wsId)  { return canDo(userId, wsId, "manage_sprints"); }
    public boolean canManageProjects(String userId, String wsId) { return canDo(userId, wsId, "manage_projects"); }
    public boolean canInviteMembers(String userId, String wsId)  { return canDo(userId, wsId, "invite_members"); }
    public boolean canManageRoles(String userId, String wsId)    { return canDo(userId, wsId, "manage_roles"); }
    public boolean isAdmin(String userId, String wsId)           { return getUserTier(userId, wsId) >= 4; }
    public boolean isOwner(String userId, String wsId)           { return getUserTier(userId, wsId) >= 5; }

    // Whether user can edit a specific work item (own or any)
    public boolean canEdit(String userId, String wsId, String itemCreatorId, String itemAssigneeId) {
        if (canEditAny(userId, wsId)) return true;
        // MEMBER tier can edit own items
        return canDo(userId, wsId, "edit_own_items")
                && (userId.equals(itemCreatorId) || userId.equals(itemAssigneeId));
    }

    /**
     * Return the user-ids of all workspace members whose role tier meets the minimum for
     * {@code permission}. Used for fan-out notifications (e.g. CHAT_ESCALATED) where the
     * producer does not know the specific recipient ids in advance.
     * Workspace-scoped (RB-40 §1) — the query is bounded to the given workspaceId.
     */
    public List<String> getMembersWithPermission(String workspaceId, String permission) {
        try {
            Integer minTier = jdbc.queryForObject(
                "SELECT min_tier FROM permissions WHERE id = ?", Integer.class, permission);
            if (minTier == null) return Collections.emptyList();
            return jdbc.queryForList(
                "SELECT wm.user_id FROM workspace_members wm "
                + "JOIN roles r ON r.id = wm.role_id "
                + "WHERE wm.workspace_id = ? AND r.tier >= ?",
                String.class, workspaceId, minTier);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
