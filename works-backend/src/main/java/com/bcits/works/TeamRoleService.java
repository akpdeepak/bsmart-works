package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap V · Role-adaptive Sprint Cockpit. Resolves WHO a user is on a project (role_key,
 * V70 vocabulary) and assembles the cockpit context — role, permissions, active sprint and
 * live ceremony — that lets one surface adapt per role. The role payload only shapes
 * relevance; every action stays RBAC-gated in its own service (RB-10 §2, RB-40 §1).
 *
 * <p>Resolution: explicit project mapping → RBAC-tier default. The tier fallback keeps the
 * cockpit useful before any roles are assigned: ADMIN+ → admin, LEAD → scrum-master,
 * MEMBER → developer, VIEWER → executive (read-only stakeholder).
 */
@Service
public class TeamRoleService {

    private final ProjectTeamMemberRepository teamMembers;
    private final SprintRepository sprints;
    private final CeremonySessionRepository ceremonies;
    private final RbacService rbac;
    private final EventService events;

    public TeamRoleService(ProjectTeamMemberRepository teamMembers, SprintRepository sprints,
                           CeremonySessionRepository ceremonies, RbacService rbac, EventService events) {
        this.teamMembers = teamMembers;
        this.sprints = sprints;
        this.ceremonies = ceremonies;
        this.rbac = rbac;
        this.events = events;
    }

    private String requireWorkspaceForProject(String callerId, String projectId, String permission) {
        String wsId = rbac.workspaceForProject(projectId);
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Project", projectId);
        }
        rbac.require(callerId, wsId, permission);
        return wsId;
    }

    // ── Pure helper (unit-testable) ───────────────────────────────────────────
    /** Tier fallback when no explicit project role is mapped. */
    static String defaultRoleForTier(int tier) {
        if (tier >= 4) return "admin";
        if (tier == 3) return "scrum-master";
        if (tier == 2) return "developer";
        return "executive";
    }

    static void validateRoleKey(String roleKey) {
        if (roleKey == null || !TodayLayoutService.ROLE_KEYS.contains(roleKey)) {
            throw ApiException.badRequest("INVALID_ROLE",
                "Unknown team role: " + roleKey + ". Expected one of " + TodayLayoutService.ROLE_KEYS + ".",
                "roleKey");
        }
    }

    // ── Reads ──────────────────────────────────────────────────────────────────
    /** The caller's effective role on a project: explicit mapping → tier default. */
    public String roleFor(String callerId, String projectId, String workspaceId) {
        return teamMembers.findByProjectIdAndUserId(projectId, callerId)
                .map(ProjectTeamMember::getRoleKey)
                .orElseGet(() -> defaultRoleForTier(rbac.getUserTier(callerId, workspaceId)));
    }

    public List<ProjectTeamMember> listByProject(String callerId, String projectId) {
        requireWorkspaceForProject(callerId, projectId, "view_items");
        return teamMembers.findByProjectIdOrderByCreatedAtAsc(projectId);
    }

    /** Everything the cockpit needs to adapt to the caller, in one call. */
    public Map<String, Object> cockpitContext(String callerId, String projectId) {
        String wsId = requireWorkspaceForProject(callerId, projectId, "view_items");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("roleKey", roleFor(callerId, projectId, wsId));
        out.put("tier", rbac.getUserTier(callerId, wsId));
        out.put("canManageSprints", rbac.canManageSprints(callerId, wsId));
        out.put("canCreateItems", rbac.canCreateItems(callerId, wsId));
        List<Sprint> active = sprints.findByProjectIdAndStatus(projectId, "ACTIVE");
        out.put("activeSprint", active.isEmpty() ? null : active.get(0));
        List<CeremonySession> live = ceremonies.findByProjectIdAndStatusOrderByCreatedAtDesc(projectId, "LIVE");
        out.put("liveCeremony", live.isEmpty() ? null : live.get(0));
        return out;
    }

    // ── Writes ──────────────────────────────────────────────────────────────────
    /** Assign or change a member's team role on a project (LEAD+). */
    @Transactional
    public ProjectTeamMember setRole(String callerId, String projectId, String userId, String roleKey) {
        String wsId = requireWorkspaceForProject(callerId, projectId, "manage_projects");
        validateRoleKey(roleKey);
        if (rbac.getUserTier(userId, wsId) < 1) {
            throw ApiException.badRequest("NOT_A_MEMBER",
                "User is not a member of this workspace.", "userId");
        }
        ProjectTeamMember m = teamMembers.findByProjectIdAndUserId(projectId, userId)
                .orElseGet(() -> {
                    ProjectTeamMember n = new ProjectTeamMember();
                    n.setId("PTM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    n.setWorkspaceId(wsId);
                    n.setProjectId(projectId);
                    n.setUserId(userId);
                    n.setCreatedBy(callerId);
                    n.setCreatedAt(OffsetDateTime.now());
                    return n;
                });
        m.setRoleKey(roleKey);
        m.setUpdatedAt(OffsetDateTime.now());
        ProjectTeamMember saved = teamMembers.save(m);
        events.recordInWorkspace(wsId, saved.getId(), "TEAM_ROLE_ASSIGNED", callerId,
                Map.of("projectId", projectId, "userId", userId, "roleKey", roleKey));
        return saved;
    }
}
