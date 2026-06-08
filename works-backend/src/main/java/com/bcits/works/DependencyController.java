package com.bcits.works;

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
import java.util.UUID;
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
        if (projectId != null) return repo.findByProjectIdScopedToUser(projectId, userId); {
        return repo.findAllScopedToUser(userId);
        }
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
        repo.findById(id).ifPresent(d -> {
            d.setDeletedAt(OffsetDateTime.now());
            repo.save(d);
        });
        return ResponseEntity.noContent().build();
    }
}
