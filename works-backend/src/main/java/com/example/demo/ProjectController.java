package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/projects")
@CrossOrigin(origins = "http://localhost:5173")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final EventService eventService;

    public ProjectController(ProjectRepository projectRepository, EventService eventService) {
        this.projectRepository = projectRepository;
        this.eventService = eventService;
    }

    @GetMapping
    public List<Project> getAllProjects(@RequestParam(required = false) String workspaceId) {
        if (workspaceId != null) return projectRepository.findByWorkspaceId(workspaceId);
        return projectRepository.findAll();
    }

    @PostMapping
    public Project createProject(@RequestBody Project project,
                                  @RequestHeader(value = "X-User-Id", required = false) String userId) {
        project.setId("PROJ-" + (int)(Math.random() * 100000));
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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable String id) {
        projectRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
