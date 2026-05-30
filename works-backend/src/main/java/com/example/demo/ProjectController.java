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

    public ProjectController(ProjectRepository projectRepository, EventService eventService,
                             JdbcTemplate jdbc, UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.eventService = eventService;
        this.jdbc = jdbc;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<Project> getAllProjects(@RequestParam(required = false) String workspaceId) {
        if (workspaceId != null) return projectRepository.findByWorkspaceId(workspaceId);
        return projectRepository.findAll();
    }

    @PostMapping
    public Project createProject(@RequestBody Project project,
                                  @RequestHeader(value = "X-User-Id", required = false) String userId) {
        project.setId("PROJ-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        project.setWorkspaceId("WS-001");
        project.setCreatedAt(OffsetDateTime.now());
        Project saved = projectRepository.save(project);
        eventService.record(saved.getId(), "PROJECT_CREATED", userId, "{\"name\":\"" + saved.getName() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public Project updateProject(@PathVariable String id, @RequestBody Project updated) {
        return projectRepository.findById(id).map(p -> {
            p.setName(updated.getName());
            p.setDescription(updated.getDescription());
            p.setLeadUserId(updated.getLeadUserId());
            return projectRepository.save(p);
        }).orElseThrow();
    }

    @PutMapping("/{id}/archive")
    public Project archiveProject(@PathVariable String id) {
        return projectRepository.findById(id).map(p -> {
            p.setArchived(!p.isArchived());
            return projectRepository.save(p);
        }).orElseThrow();
    }

    @GetMapping("/{id}/members")
    public List<Map<String, Object>> getProjectMembers(@PathVariable String id) {
        return jdbc.queryForList(
            "SELECT u.id, u.full_name, u.email, pm.role FROM project_members pm " +
            "JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ?", id);
    }

    @PostMapping("/{id}/members")
    public Map<String, String> addProjectMember(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String role  = payload.getOrDefault("role", "MEMBER");
        userRepository.findByEmail(email).ifPresent(u ->
            jdbc.update("INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?) ON CONFLICT DO NOTHING",
                id, u.getId(), role));
        return Map.of("message", "Member added");
    }

    @DeleteMapping("/{id}/members/{userId}")
    public Map<String, String> removeProjectMember(@PathVariable String id, @PathVariable String userId) {
        jdbc.update("DELETE FROM project_members WHERE project_id = ? AND user_id = ?", id, userId);
        return Map.of("message", "Member removed");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable String id) {
        projectRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}


