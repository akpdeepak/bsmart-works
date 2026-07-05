package com.bcits.works.workspaces;

import com.bcits.works.FunnelService;

import com.bcits.works.auth.User;
import com.bcits.works.auth.UserRepository;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Workspace business logic — tenant isolation, RBAC, member + branding management, and the
 * caller's workspace list.
 *
 * <p>This is the one place workspace authorization and data access live (RB-10 §2; CLAUDE.md §4 —
 * "RBAC in the service, never the controller"). The controller only parses HTTP and delegates.
 *
 * <p><b>Tenant isolation (RB-40 §1):</b> every read first asserts the caller is a member of the
 * target workspace; a non-member gets a 404 so a foreign workspace's existence is never revealed.
 * Mutations go through {@link RbacGate#require} which is fail-closed for non-members (tier 0).
 */
@Service
public class WorkspaceService {

    private static final String DEFAULT_BRAND_COLOR = "#E94E1B";

    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final RbacGate rbac;
    private final EventService eventService;
    private final JdbcTemplate jdbc;
    private final FunnelService funnelService;

    public WorkspaceService(WorkspaceRepository workspaceRepository, UserRepository userRepository,
                            RbacGate rbac, EventService eventService, JdbcTemplate jdbc,
                            FunnelService funnelService) {
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.rbac = rbac;
        this.eventService = eventService;
        this.jdbc = jdbc;
        this.funnelService = funnelService;
    }

    // ── Tenant isolation guard (RB-40 §1) ────────────────────────────────────

    /** Caller must be a member; otherwise 404 — never confirm a foreign workspace exists. */
    private void requireMember(String callerId, String workspaceId) {
        if (rbac.getUserTier(callerId, workspaceId) < 1) {
            throw ApiException.notFound("Workspace", workspaceId);
        }
    }

    /** A project must belong to the path workspace, else 404 — blocks cross-tenant project access. */
    private void requireProjectInWorkspace(String projectId, String workspaceId) {
        String owner = rbac.workspaceForProject(projectId);
        if (owner == null || !owner.equals(workspaceId)) {
            throw ApiException.notFound("Project", projectId);
        }
    }

    // ── Workspace context ────────────────────────────────────────────────────

    /** Workspaces the caller belongs to — the membership truth the switcher renders. */
    public List<Map<String, Object>> myWorkspaces(String callerId) {
        return jdbc.queryForList(
            "SELECT w.id, w.name, w.slug, wm.role_id AS role "
            + "FROM workspace_members wm JOIN workspaces w ON w.id = wm.workspace_id "
            + "WHERE wm.user_id = ? ORDER BY w.name", callerId);
    }

    public Workspace getWorkspace(String callerId, String workspaceId) {
        requireMember(callerId, workspaceId);
        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> ApiException.notFound("Workspace", workspaceId));
    }

    @Transactional
    public Workspace updateWorkspace(String callerId, String workspaceId, String name) {
        rbac.require(callerId, workspaceId, "manage_workspace");
        Workspace w = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> ApiException.notFound("Workspace", workspaceId));
        String oldName = w.getName();
        w.setName(name);
        Workspace saved = workspaceRepository.save(w);
        eventService.recordDiff(workspaceId, "WORKSPACE_UPDATED", callerId, "name", oldName, name);
        return saved;
    }

    // ── Members ──────────────────────────────────────────────────────────────

    public List<Map<String, String>> getMembers(String callerId, String workspaceId) {
        requireMember(callerId, workspaceId);
        return jdbc.query(
            "SELECT u.id, u.full_name, u.email, wm.system_role FROM workspace_members wm "
            + "JOIN users u ON u.id = wm.user_id WHERE wm.workspace_id = ?",
            (rs, row) -> Map.of(
                "id", rs.getString("id"),
                "fullName", rs.getString("full_name"),
                "email", rs.getString("email"),
                "role", rs.getString("system_role")
            ), workspaceId);
    }

    @Transactional
    public Map<String, String> addMember(String callerId, String workspaceId, String email, String role) {
        rbac.require(callerId, workspaceId, "invite_members");
        String resolvedRole = (role == null || role.isBlank()) ? "MEMBER" : role;
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.notFound("User", email));
        jdbc.update("INSERT INTO workspace_members (workspace_id, user_id, system_role) "
                + "VALUES (?, ?, ?) ON CONFLICT DO NOTHING", workspaceId, user.getId(), resolvedRole);
        eventService.recordInWorkspace(workspaceId, workspaceId, "MEMBER_ADDED", callerId,
                Map.of("workspaceId", workspaceId, "userId", user.getId(), "role", resolvedRole));
        funnelService.onTeammateInvited(workspaceId, callerId, user.getId());
        return Map.of("message", "Member added", "userId", user.getId());
    }

    @Transactional
    public Map<String, String> removeMember(String callerId, String workspaceId, String memberId) {
        rbac.require(callerId, workspaceId, "remove_members");
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
                workspaceId, memberId);
        eventService.recordInWorkspace(workspaceId, workspaceId, "MEMBER_REMOVED", callerId,
                Map.of("workspaceId", workspaceId, "userId", memberId));
        return Map.of("message", "Member removed");
    }

    // ── Branding ─────────────────────────────────────────────────────────────

    public Map<String, Object> getBranding(String callerId, String workspaceId) {
        requireMember(callerId, workspaceId);
        Workspace w = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> ApiException.notFound("Workspace", workspaceId));
        return brandingMap(w);
    }

    @Transactional
    public Map<String, Object> updateBranding(String callerId, String workspaceId,
                                              String primaryColor, String logoUrl, String description) {
        rbac.require(callerId, workspaceId, "manage_workspace");
        Workspace w = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> ApiException.notFound("Workspace", workspaceId));
        w.setPrimaryColor((primaryColor == null || primaryColor.isBlank()) ? DEFAULT_BRAND_COLOR : primaryColor);
        w.setLogoUrl((logoUrl == null || logoUrl.isBlank()) ? null : logoUrl);
        w.setDescription(description);
        workspaceRepository.save(w);
        eventService.recordInWorkspace(workspaceId, workspaceId, "WORKSPACE_BRANDING_UPDATED", callerId,
                Map.of("workspaceId", workspaceId, "primaryColor", w.getPrimaryColor()));
        return brandingMap(w);
    }

    private Map<String, Object> brandingMap(Workspace w) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("primaryColor", w.getPrimaryColor() != null ? w.getPrimaryColor() : DEFAULT_BRAND_COLOR);
        m.put("logoUrl", w.getLogoUrl() != null ? w.getLogoUrl() : "");
        m.put("description", w.getDescription() != null ? w.getDescription() : "");
        return m;
    }

    // ── Sandbox / test mode (Cap D, iteration 14) ────────────────────────────────

    @Transactional
    public Workspace setSandboxMode(String callerId, String workspaceId, boolean enabled) {
        rbac.require(callerId, workspaceId, "manage_workspace");
        Workspace w = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> ApiException.notFound("Workspace", workspaceId));
        w.setSandboxMode(enabled);
        workspaceRepository.save(w);
        eventService.recordInWorkspace(workspaceId, workspaceId, "SANDBOX_MODE_CHANGED", callerId,
                Map.of("workspaceId", workspaceId, "sandboxMode", enabled));
        return w;
    }

    // ── Project members (workspace-scoped) ────────────────────────────────────

    public List<Map<String, Object>> getProjectMembers(String callerId, String workspaceId, String projectId) {
        requireMember(callerId, workspaceId);
        requireProjectInWorkspace(projectId, workspaceId);
        return jdbc.queryForList(
            "SELECT u.id, u.full_name, u.email, pm.role FROM project_members pm "
            + "JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ?", projectId);
    }

    @Transactional
    public Map<String, String> addProjectMember(String callerId, String workspaceId, String projectId,
                                                String email, String role) {
        rbac.require(callerId, workspaceId, "manage_projects");
        requireProjectInWorkspace(projectId, workspaceId);
        String resolvedRole = (role == null || role.isBlank()) ? "MEMBER" : role;
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.notFound("User", email));
        jdbc.update("INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?) "
                + "ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role",
                projectId, user.getId(), resolvedRole);
        eventService.recordInWorkspace(workspaceId, projectId, "PROJECT_MEMBER_ADDED", callerId,
                Map.of("workspaceId", workspaceId, "projectId", projectId,
                        "userId", user.getId(), "role", resolvedRole));
        return Map.of("message", "Member added", "userId", user.getId());
    }

    @Transactional
    public Map<String, String> removeProjectMember(String callerId, String workspaceId, String projectId,
                                                   String memberId) {
        rbac.require(callerId, workspaceId, "manage_projects");
        requireProjectInWorkspace(projectId, workspaceId);
        jdbc.update("DELETE FROM project_members WHERE project_id = ? AND user_id = ?", projectId, memberId);
        eventService.recordInWorkspace(workspaceId, projectId, "PROJECT_MEMBER_REMOVED", callerId,
                Map.of("workspaceId", workspaceId, "projectId", projectId, "userId", memberId));
        return Map.of("message", "Member removed");
    }
}
