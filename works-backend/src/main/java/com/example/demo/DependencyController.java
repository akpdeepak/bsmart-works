package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/dependencies")
public class DependencyController {

    private final DependencyRepository repo;
    private final AuthenticatedUser authenticatedUser;

    public DependencyController(DependencyRepository repo, AuthenticatedUser authenticatedUser) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Dependency> list(@RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only dependencies from their workspaces.
        if (projectId != null) return repo.findByProjectIdScopedToUser(projectId, userId);
        return repo.findAllScopedToUser(userId);
    }

    @GetMapping("/{id}")
    public Dependency get(@PathVariable String id) { return repo.findById(id).orElseThrow(); }

    @PostMapping
    public Dependency create(@Valid @RequestBody Dependency dep) {
        dep.setId("DEP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        dep.setCreatedBy(authenticatedUser.id());
        dep.setCreatedAt(OffsetDateTime.now());
        dep.setUpdatedAt(OffsetDateTime.now());
        return repo.save(dep);
    }

    @PutMapping("/{id}")
    public Dependency update(@PathVariable String id, @Valid @RequestBody Dependency updated) {
        return repo.findById(id).map(d -> {
            d.setTitle(updated.getTitle());
            d.setDescription(updated.getDescription());
            d.setDependentTeam(updated.getDependentTeam());
            d.setProvidingTeam(updated.getProvidingTeam());
            d.setStatus(updated.getStatus());
            d.setDeadline(updated.getDeadline());
            d.setIsBlocker(updated.getIsBlocker());
            d.setRelatedWorkItemId(updated.getRelatedWorkItemId());
            d.setOwnerId(updated.getOwnerId());
            d.setUpdatedAt(OffsetDateTime.now());
            return repo.save(d);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        repo.findById(id).ifPresent(d -> { d.setDeletedAt(OffsetDateTime.now()); repo.save(d); });
        return ResponseEntity.noContent().build();
    }
}
