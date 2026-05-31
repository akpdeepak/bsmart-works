package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final EventService eventService;
    private final JdbcTemplate jdbc;
    private final UserRepository userRepository;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ProjectController(ProjectRepository projectRepository, EventService eventService,
                             JdbcTemplate jdbc, UserRepository userRepository,
                             AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.projectRepository = projectRepository;
        this.eventService = eventService;
        this.jdbc = jdbc;
        this.userRepository = userRepository;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<Project> getAllProjects(@RequestParam(required = false) String workspaceId) {
        if (workspaceId != null) return projectRepository.findByWorkspaceId(workspaceId);
        return projectRepository.findAll();
    }

    @GetMapping("/by-slug/{slug}")
    public ResponseEntity<Project> getBySlug(@PathVariable String slug) {
        return projectRepository.findBySlug(slug)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Project createProject(@RequestBody Project project) {
        String userId = authenticatedUser.id();
        String wsId = project.getWorkspaceId() != null ? project.getWorkspaceId() : "WS-001";
        rbac.require(userId, wsId, "manage_projects");

        project.setId("PROJ-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        project.setWorkspaceId(wsId);
        project.setCreatedAt(OffsetDateTime.now());
        if (project.getSlug() == null || project.getSlug().isBlank()) {
            project.setSlug(toSlug(project.getKeyPrefix() != null ? project.getKeyPrefix() : project.getName()));
        }
        Project saved = projectRepository.save(project);
        eventService.record(saved.getId(), "PROJECT_CREATED", userId, "{\"name\":\"" + saved.getName() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public Project updateProject(@PathVariable String id, @RequestBody Project updated) {
        String userId = authenticatedUser.id();
        Project existing = projectRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Project", id));
        rbac.require(userId, existing.getWorkspaceId(), "manage_projects");
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setLeadUserId(updated.getLeadUserId());
        return projectRepository.save(existing);
    }

    @PutMapping("/{id}/archive")
    public Project archiveProject(@PathVariable String id) {
        String userId = authenticatedUser.id();
        Project existing = projectRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Project", id));
        rbac.require(userId, existing.getWorkspaceId(), "manage_projects");
        existing.setArchived(!existing.isArchived());
        return projectRepository.save(existing);
    }

    @GetMapping("/{id}/members")
    public List<Map<String, Object>> getProjectMembers(@PathVariable String id) {
        return jdbc.queryForList(
            "SELECT u.id, u.full_name, u.email, pm.role FROM project_members pm " +
            "JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ?", id);
    }

    @PostMapping("/{id}/members")
    public Map<String, String> addProjectMember(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String userId = authenticatedUser.id();
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Project", id));
        rbac.require(userId, project.getWorkspaceId(), "manage_projects");
        String email = payload.get("email");
        String role  = payload.getOrDefault("role", "MEMBER");
        userRepository.findByEmail(email).ifPresent(u ->
            jdbc.update("INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?) ON CONFLICT DO NOTHING",
                id, u.getId(), role));
        return Map.of("message", "Member added");
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public Map<String, String> removeProjectMember(@PathVariable String id, @PathVariable String memberId) {
        String userId = authenticatedUser.id();
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Project", id));
        rbac.require(userId, project.getWorkspaceId(), "manage_projects");
        jdbc.update("DELETE FROM project_members WHERE project_id = ? AND user_id = ?", id, memberId);
        return Map.of("message", "Member removed");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable String id) {
        String userId = authenticatedUser.id();
        Project existing = projectRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Project", id));
        rbac.require(userId, existing.getWorkspaceId(), "manage_projects");
        projectRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private String toSlug(String raw) {
        return raw.toLowerCase()
                  .replaceAll("[^a-z0-9]+", "-")
                  .replaceAll("^-|-$", "");
    }
}
