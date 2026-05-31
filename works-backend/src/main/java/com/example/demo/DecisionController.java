package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/decisions")
public class DecisionController {

    private final DecisionRepository repo;
    private final AuthenticatedUser authenticatedUser;

    public DecisionController(DecisionRepository repo, AuthenticatedUser authenticatedUser) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Decision> list(@RequestParam(required = false) String projectId) {
        if (projectId != null) return repo.findByProjectIdAndDeletedAtIsNull(projectId);
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public Decision get(@PathVariable String id) { return repo.findById(id).orElseThrow(); }

    @PostMapping
    public Decision create(@RequestBody Decision d) {
        d.setId("DEC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        d.setCreatedBy(authenticatedUser.id());
        d.setCreatedAt(OffsetDateTime.now());
        d.setUpdatedAt(OffsetDateTime.now());
        if (d.getLinks() == null) d.setLinks("[]");
        return repo.save(d);
    }

    @PutMapping("/{id}")
    public Decision update(@PathVariable String id, @RequestBody Decision updated) {
        return repo.findById(id).map(d -> {
            d.setTitle(updated.getTitle());
            d.setDescription(updated.getDescription());
            d.setAlternatives(updated.getAlternatives());
            d.setRationale(updated.getRationale());
            d.setStatus(updated.getStatus());
            d.setDecisionDate(updated.getDecisionDate());
            d.setOwnerId(updated.getOwnerId());
            d.setRelatedRiskId(updated.getRelatedRiskId());
            if (updated.getLinks() != null) d.setLinks(updated.getLinks());
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
