package com.bcits.works;

import com.bcits.works.auth.UserRepository;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Project business logic — tenant isolation, RBAC, lifecycle, and membership (RB-10 §2; CLAUDE.md
 * §4 — RBAC in the service, not the controller). Resolves the parked I01-S02 RBAC-in-controller item
 * for projects.
 *
 * <p>Tenant isolation (RB-40 §1): listing is confined to workspaces the caller belongs to, and every
 * single-project read asserts membership of the project's workspace (404 for non-members — a foreign
 * project's existence is never revealed). Writes gate through {@link RbacGate#require}.
 */
@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final EventService eventService;
    private final RbacGate rbac;
    private final JdbcTemplate jdbc;
    private final CurrentWorkspace currentWorkspace;

    public ProjectService(ProjectRepository projectRepository, UserRepository userRepository,
                          EventService eventService, RbacGate rbac, JdbcTemplate jdbc,
                          CurrentWorkspace currentWorkspace) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.eventService = eventService;
        this.rbac = rbac;
        this.jdbc = jdbc;
        this.currentWorkspace = currentWorkspace;
    }

    private void requireMember(String callerId, String workspaceId) {
        if (workspaceId == null || rbac.getUserTier(callerId, workspaceId) < 1) {
            throw ApiException.notFound("Project", workspaceId);
        }
    }

    private Project loadForMember(String callerId, String id) {
        Project p = projectRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Project", id));
        requireMember(callerId, p.getWorkspaceId());
        return p;
    }

    // ── Read (tenant-scoped) ──────────────────────────────────────────────────

    /** Projects in a workspace the caller belongs to; or, when no workspace is given, across all of
     *  the caller's workspaces. Never returns rows from a workspace the caller is not a member of. */
    public List<Project> list(String callerId, String workspaceId) {
        if (workspaceId != null && !workspaceId.isBlank()) {
            requireMember(callerId, workspaceId);
            // Defence-in-depth (RB-40 §1): bind the central tenant filter to this workspace so the
            // read is narrowed even if the explicit predicate below were ever dropped. Additive —
            // the filter can only confirm the same workspace, never widen the result.
            currentWorkspace.bind(workspaceId);
            return projectRepository.findByWorkspaceId(workspaceId);
        }
        // Cross-workspace case (all of the caller's workspaces): the central single-workspace filter
        // must NOT be bound here — the explicit findByWorkspaceIdIn below is the scope, and binding a
        // single workspace would wrongly drop the caller's other workspaces. Filter stays dormant.
        List<String> memberWorkspaces = jdbc.queryForList(
                "SELECT workspace_id FROM workspace_members WHERE user_id = ?", String.class, callerId);
        if (memberWorkspaces.isEmpty()) return List.of(); {
        return projectRepository.findByWorkspaceIdIn(memberWorkspaces);
        }
    }

    public Project getBySlug(String callerId, String slug) {
        Project p = projectRepository.findBySlug(slug)
                .orElseThrow(() -> ApiException.notFound("Project", slug));
        requireMember(callerId, p.getWorkspaceId());
        return p;
    }

    public List<Map<String, Object>> getMembers(String callerId, String projectId) {
        loadForMember(callerId, projectId);
        return jdbc.queryForList(
                "SELECT u.id, u.full_name, u.email, pm.role FROM project_members pm "
                + "JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ?", projectId);
    }

    // ── Write (RBAC-gated) ────────────────────────────────────────────────────

    @Transactional
    public Project create(String callerId, Project project) {
        String wsId = project.getWorkspaceId();
        if (wsId == null || wsId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "A workspace is required to create a project.");
        }
        rbac.require(callerId, wsId, "manage_projects");
        project.setId("PROJ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        project.setWorkspaceId(wsId);
        project.setCreatedAt(OffsetDateTime.now());
        if (project.getSlug() == null || project.getSlug().isBlank()) {
            project.setSlug(toSlug(project.getKeyPrefix() != null ? project.getKeyPrefix() : project.getName()));
        }
        Project saved = projectRepository.save(project);
        eventService.recordInWorkspace(wsId, saved.getId(), "PROJECT_CREATED", callerId,
                Map.of("workspaceId", wsId, "name", saved.getName() != null ? saved.getName() : ""));
        return saved;
    }

    @Transactional
    public Project update(String callerId, String id, Project updated) {
        Project existing = projectRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Project", id));
        rbac.require(callerId, existing.getWorkspaceId(), "manage_projects");
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setLeadUserId(updated.getLeadUserId());
        return projectRepository.save(existing);
    }

    @Transactional
    public Project toggleArchive(String callerId, String id) {
        Project existing = projectRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Project", id));
        rbac.require(callerId, existing.getWorkspaceId(), "manage_projects");
        existing.setArchived(!existing.isArchived());
        Project saved = projectRepository.save(existing);
        eventService.recordInWorkspace(existing.getWorkspaceId(), id,
                saved.isArchived() ? "PROJECT_ARCHIVED" : "PROJECT_UNARCHIVED", callerId,
                Map.of("workspaceId", existing.getWorkspaceId()));
        return saved;
    }

    @Transactional
    public void delete(String callerId, String id) {
        Project existing = projectRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Project", id));
        rbac.require(callerId, existing.getWorkspaceId(), "manage_projects");
        projectRepository.deleteById(id);
        eventService.recordInWorkspace(existing.getWorkspaceId(), id, "PROJECT_DELETED", callerId,
                Map.of("workspaceId", existing.getWorkspaceId()));
    }

    @Transactional
    public Map<String, String> addMember(String callerId, String projectId, String email, String role) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> ApiException.notFound("Project", projectId));
        rbac.require(callerId, project.getWorkspaceId(), "manage_projects");
        String resolvedRole = (role == null || role.isBlank()) ? "MEMBER" : role;
        userRepository.findByEmail(email).ifPresent(u ->
                jdbc.update("INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?) "
                        + "ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role",
                        projectId, u.getId(), resolvedRole));
        return Map.of("message", "Member added");
    }

    @Transactional
    public Map<String, String> removeMember(String callerId, String projectId, String memberId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> ApiException.notFound("Project", projectId));
        rbac.require(callerId, project.getWorkspaceId(), "manage_projects");
        jdbc.update("DELETE FROM project_members WHERE project_id = ? AND user_id = ?", projectId, memberId);
        return Map.of("message", "Member removed");
    }

    private String toSlug(String raw) {
        return raw.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }
}
