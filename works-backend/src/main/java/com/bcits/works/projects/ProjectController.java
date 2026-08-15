package com.bcits.works.projects;
import com.bcits.works.projects.api.Project;
import com.bcits.works.projects.api.ProjectHealth;
import com.bcits.works.projects.api.ProjectRisk;
import com.bcits.works.projects.api.ProjectDecision;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

/**
 * HTTP surface for projects — parse, delegate to {@link ProjectService}, return. No business logic,
 * authorization, or data access here (RB-10 §2; CLAUDE.md §4).
 */
@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final AuthenticatedUser authenticatedUser;

    public ProjectController(ProjectService projectService, AuthenticatedUser authenticatedUser) {
        this.projectService = projectService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Project> getAllProjects(@RequestParam(required = false) String workspaceId) {
        return projectService.list(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/by-slug/{slug}")
    public Project getBySlug(@PathVariable String slug) {
        return projectService.getBySlug(authenticatedUser.id(), slug);
    }

    @GetMapping("/{id}/capabilities")
    public Map<String, Boolean> getCapabilities(@PathVariable String id) {
        return projectService.capabilities(authenticatedUser.id(), id);
    }

    @PostMapping
    public Project createProject(@Valid @RequestBody Project project) {
        return projectService.create(authenticatedUser.id(), project);
    }

    @PutMapping("/{id}")
    public Project updateProject(@PathVariable String id, @Valid @RequestBody Project updated) {
        return projectService.update(authenticatedUser.id(), id, updated);
    }

    @PutMapping("/{id}/archive")
    public Project archiveProject(@PathVariable String id) {
        return projectService.toggleArchive(authenticatedUser.id(), id);
    }

    @GetMapping("/{id}/members")
    public List<Map<String, Object>> getProjectMembers(@PathVariable String id) {
        return projectService.getMembers(authenticatedUser.id(), id);
    }

    @PostMapping("/{id}/members")
    public Map<String, String> addProjectMember(@PathVariable String id,
                                                @Valid @RequestBody Map<String, String> payload) {
        return projectService.addMember(authenticatedUser.id(), id, payload.get("email"), payload.get("role"));
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public Map<String, String> removeProjectMember(@PathVariable String id, @PathVariable String memberId) {
        return projectService.removeMember(authenticatedUser.id(), id, memberId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable String id) {
        projectService.delete(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }

    // ── Command Center Endpoints ───────────────────────────────────────────────

    @GetMapping("/{id}/health")
    public ProjectHealth getHealth(@PathVariable String id) {
        return projectService.getHealth(authenticatedUser.id(), id);
    }

    @PostMapping("/{id}/health")
    public ProjectHealth updateHealth(@PathVariable String id, @Valid @RequestBody ProjectHealth health) {
        return projectService.updateHealth(authenticatedUser.id(), id, health);
    }

    @GetMapping("/{id}/risks")
    public List<ProjectRisk> getRisks(@PathVariable String id) {
        return projectService.getRisks(authenticatedUser.id(), id);
    }

    @PostMapping("/{id}/risks")
    public ProjectRisk addRisk(@PathVariable String id, @Valid @RequestBody ProjectRisk risk) {
        return projectService.addRisk(authenticatedUser.id(), id, risk);
    }

    @GetMapping("/{id}/decisions")
    public List<ProjectDecision> getDecisions(@PathVariable String id) {
        return projectService.getDecisions(authenticatedUser.id(), id);
    }

    @PostMapping("/{id}/decisions")
    public ProjectDecision addDecision(@PathVariable String id, @Valid @RequestBody ProjectDecision decision) {
        return projectService.addDecision(authenticatedUser.id(), id, decision);
    }
}
