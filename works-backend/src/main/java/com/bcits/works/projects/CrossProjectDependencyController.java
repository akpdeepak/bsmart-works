package com.bcits.works.projects;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

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
import java.time.OffsetDateTime;
import java.util.List;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/cross-project-dependencies")
public class CrossProjectDependencyController {

    private final CrossProjectDependencyRepository dependencyRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public CrossProjectDependencyController(CrossProjectDependencyRepository dependencyRepository,
                                            EventService eventService, AuthenticatedUser authenticatedUser,
                                            RbacGate rbac) {
        this.dependencyRepository = dependencyRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<CrossProjectDependency> getDependencies(
            @RequestParam(required = false) String projectId,
            @RequestParam(required = false) String workspaceId) {
        String callerId = authenticatedUser.id();
        if (projectId != null) {
            String wsId = rbac.workspaceForProject(projectId);
            if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
                throw ApiException.notFound("Project", projectId);
            }
            return dependencyRepository.findByFromProjectIdOrderByCreatedAtDesc(projectId);
        }
        if (workspaceId != null) {
            if (rbac.getUserTier(callerId, workspaceId) < 1) {
                throw ApiException.notFound("Workspace", workspaceId);
            }
            return dependencyRepository.findByWorkspaceId(workspaceId);
        }
        throw ApiException.badRequest("MISSING_PARAM", "Either projectId or workspaceId is required");
    }

    @GetMapping("/{id}")
    public CrossProjectDependency getDependency(@PathVariable String id) {
        CrossProjectDependency dep = dependencyRepository.findById(id).orElseThrow();
        String wsId = rbac.workspaceForProject(dep.getFromProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("CrossProjectDependency", id);
        }
        return dep;
    }

    @PostMapping
    public CrossProjectDependency createDependency(@Valid @RequestBody CrossProjectDependency dep) {
        String userId = authenticatedUser.id();
        dep.setId("DEP-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        dep.setStatus(dep.getStatus() != null ? dep.getStatus() : "PENDING");
        dep.setIsBlocker(dep.getIsBlocker() != null ? dep.getIsBlocker() : false);
        dep.setCreatedBy(userId);
        dep.setCreatedAt(OffsetDateTime.now());
        dep.setUpdatedAt(OffsetDateTime.now());
        CrossProjectDependency saved = dependencyRepository.save(dep);
        eventService.record(saved.getId(), "DEPENDENCY_CREATED", userId, "{\"title\":\"" + saved.getTitle() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public CrossProjectDependency updateDependency(@PathVariable String id, @Valid @RequestBody CrossProjectDependency updated) {
        String userId = authenticatedUser.id();
        CrossProjectDependency existing = dependencyRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("CrossProjectDependency", id));
        String wsId = rbac.workspaceForProject(existing.getFromProjectId());
        if (wsId == null || rbac.getUserTier(userId, wsId) < 1) {
            throw ApiException.notFound("CrossProjectDependency", id);
        }
        return dependencyRepository.findById(id).map(d -> {
            d.setTitle(updated.getTitle());
            d.setDescription(updated.getDescription());
            d.setToProjectId(updated.getToProjectId());
            d.setDeadline(updated.getDeadline());
            d.setStatus(updated.getStatus());
            d.setIsBlocker(updated.getIsBlocker());
            d.setOwnerId(updated.getOwnerId());
            d.setUpdatedAt(OffsetDateTime.now());
            CrossProjectDependency saved = dependencyRepository.save(d);
            eventService.record(id, "DEPENDENCY_UPDATED", userId, "{\"status\":\"" + saved.getStatus() + "\"}");
            return saved;
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDependency(@PathVariable String id) {
        dependencyRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
