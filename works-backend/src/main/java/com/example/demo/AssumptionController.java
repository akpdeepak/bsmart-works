package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;

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
        if (projectId != null) return repo.findByProjectIdAndDeletedAtIsNull(projectId);
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public Assumption get(@PathVariable String id) { return repo.findById(id).orElseThrow(); }

    @PostMapping
    public Assumption create(@RequestBody Assumption a) {
        a.setId("ASM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        a.setCreatedBy(authenticatedUser.id());
        a.setCreatedAt(OffsetDateTime.now());
        a.setUpdatedAt(OffsetDateTime.now());
        return repo.save(a);
    }

    @PutMapping("/{id}")
    public Assumption update(@PathVariable String id, @RequestBody Assumption updated) {
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
