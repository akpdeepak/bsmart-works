package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/assumptions")
public class AssumptionController {

    private final AssumptionRepository repo;
    private final AuthenticatedUser authenticatedUser;

    public AssumptionController(AssumptionRepository repo, AuthenticatedUser authenticatedUser) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Assumption> list(@RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only assumptions from their workspaces.
        if (projectId != null) return repo.findByProjectIdScopedToUser(projectId, userId);
        return repo.findAllScopedToUser(userId);
    }

    @GetMapping("/{id}")
    public Assumption get(@PathVariable String id) { return repo.findById(id).orElseThrow(); }

    @PostMapping
    public Assumption create(@Valid @RequestBody Assumption a) {
        a.setId("ASM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        a.setCreatedBy(authenticatedUser.id());
        a.setCreatedAt(OffsetDateTime.now());
        a.setUpdatedAt(OffsetDateTime.now());
        return repo.save(a);
    }

    @PutMapping("/{id}")
    public Assumption update(@PathVariable String id, @Valid @RequestBody Assumption updated) {
        return repo.findById(id).map(a -> {
            a.setTitle(updated.getTitle());
            a.setDescription(updated.getDescription());
            a.setRationale(updated.getRationale());
            a.setValidationStatus(updated.getValidationStatus());
            a.setOwnerId(updated.getOwnerId());
            a.setExpiryDate(updated.getExpiryDate());
            a.setUpdatedAt(OffsetDateTime.now());
            return repo.save(a);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        repo.findById(id).ifPresent(a -> { a.setDeletedAt(OffsetDateTime.now()); repo.save(a); });
        return ResponseEntity.noContent().build();
    }
}
