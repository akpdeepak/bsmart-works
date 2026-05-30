package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Role-based access control service.
 * Tier hierarchy: VIEWER(1) < MEMBER(2) < LEAD(3) < ADMIN(4) < OWNER(5)
 * Every check compares caller's tier against the required permission's min_tier.
 */
@Service
public class RbacService {

    private final JdbcTemplate jdbc;

    public RbacService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

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

    public boolean canDo(String userId, String workspaceId, String permission) {
        try {
            Integer minTier = jdbc.queryForObject(
                "SELECT min_tier FROM permissions WHERE id = ?", Integer.class, permission);
            if (minTier == null) return false;
            int userTier = getUserTier(userId, workspaceId);
            return userTier >= minTier;
        } catch (Exception e) {
            return false;
        }
    }

    // Convenience methods
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
}
