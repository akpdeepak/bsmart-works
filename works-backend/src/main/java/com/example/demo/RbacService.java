package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Role-based access control service.
 * Tier hierarchy: VIEWER(1) < MEMBER(2) < LEAD(3) < ADMIN(4) < OWNER(5)
 * All permission checks go through here — never in controllers.
 */
@Service
public class RbacService {

    private final JdbcTemplate jdbc;

    public RbacService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ── Tier lookup ──────────────────────────────────────────────────────────

    public int getUserTier(String userId, String workspaceId) {
        try {
            return jdbc.queryForObject(
                "SELECT r.tier FROM workspace_members wm " +
                "JOIN roles r ON r.id = wm.role_id " +
                "WHERE wm.user_id = ? AND wm.workspace_id = ?",
                Integer.class, userId, workspaceId);
        } catch (Exception e) {
            return 0; // not a member
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
            if (minTier == null) return false;
            return getUserTier(userId, workspaceId) >= minTier;
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
}
