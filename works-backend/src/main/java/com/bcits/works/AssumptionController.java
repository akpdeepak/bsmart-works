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
        if (projectId != null) return repo.findByProjectIdScopedToUser(projectId, userId); {
        return repo.findAllScopedToUser(userId);
        }
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
        repo.findById(id).ifPresent(a -> {
            a.setDeletedAt(OffsetDateTime.now());
            repo.save(a);
        });
        return ResponseEntity.noContent().build();
    }
}
