package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/cross-project-dependencies")
public class CrossProjectDependencyController {

    private final CrossProjectDependencyRepository dependencyRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;

    public CrossProjectDependencyController(CrossProjectDependencyRepository dependencyRepository,
                                            EventService eventService, AuthenticatedUser authenticatedUser) {
        this.dependencyRepository = dependencyRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<CrossProjectDependency> getDependencies(@RequestParam(required = false) String projectId) {
        return projectId != null
            ? dependencyRepository.findByFromProjectIdOrderByCreatedAtDesc(projectId)
            : dependencyRepository.findAll();
    }

    @GetMapping("/{id}")
    public CrossProjectDependency getDependency(@PathVariable String id) {
        return dependencyRepository.findById(id).orElseThrow();
    }

    @PostMapping
    public CrossProjectDependency createDependency(@RequestBody CrossProjectDependency dep) {
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
    public CrossProjectDependency updateDependency(@PathVariable String id, @RequestBody CrossProjectDependency updated) {
        String userId = authenticatedUser.id();
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
