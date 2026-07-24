package com.bcits.works.shared;
import com.bcits.works.auth.RbacService;
import com.bcits.works.auth.api.User;

import java.util.List;

/**
 * Authorization port — the RBAC choke point (RB-10 §2: all permission checks go through here,
 * never in controllers). The single implementation is {@code RbacService}.
 *
 * <p>Consumers depend on this interface <b>in the shared kernel</b> so the RBAC engine can be
 * relocated into its owning domain module ({@code auth}) without every caller acquiring a
 * compile dependency on that module — which would make the acyclic-slices architecture rule
 * unsatisfiable (EPIC-03 Phase 2, G-2). The interface carries only JDK types, so it never points
 * back at a domain module and is safe to live in {@code shared}.
 *
 * <p>Tier hierarchy: VIEWER(1) &lt; MEMBER(2) &lt; LEAD(3) &lt; ADMIN(4) &lt; OWNER(5).
 */
public interface RbacGate {

    /** Membership tier of {@code userId} in {@code workspaceId}; 0 if not a member. */
    int getUserTier(String userId, String workspaceId);

    /** Role id of {@code userId} in {@code workspaceId}; {@code "NONE"} if not a member. */
    String getUserRole(String userId, String workspaceId);

    /** Whether {@code userId} holds {@code permission} in {@code workspaceId}. */
    boolean canDo(String userId, String workspaceId, String permission);

    /** Throw 403 if {@code userId} lacks {@code permission} in {@code workspaceId}. */
    void require(String userId, String workspaceId, String permission);

    /** Resolve the owning workspaceId of a project; {@code null} if it does not exist. */
    String workspaceForProject(String projectId);

    /** Resolve the owning workspaceId of a work item (via its project); {@code null} if absent. */
    String workspaceForWorkItem(String workItemId);

    boolean canView(String userId, String wsId);

    boolean canCreateItems(String userId, String wsId);

    boolean canEditAny(String userId, String wsId);

    boolean canDeleteItems(String userId, String wsId);

    boolean canManageSprints(String userId, String wsId);

    boolean canManageProjects(String userId, String wsId);

    boolean canInviteMembers(String userId, String wsId);

    boolean canManageRoles(String userId, String wsId);

    boolean isAdmin(String userId, String wsId);

    boolean isOwner(String userId, String wsId);

    /** Whether {@code userId} may edit a specific work item (edit-any, or edit-own when creator/assignee). */
    boolean canEdit(String userId, String wsId, String itemCreatorId, String itemAssigneeId);

    /** User-ids of all members of {@code workspaceId} whose tier meets the minimum for {@code permission}. */
    List<String> getMembersWithPermission(String workspaceId, String permission);
}
