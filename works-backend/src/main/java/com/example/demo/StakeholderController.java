package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/stakeholders")
public class StakeholderController {

    private final StakeholderRepository repo;
    private final AuthenticatedUser authenticatedUser;

    public StakeholderController(StakeholderRepository repo, AuthenticatedUser authenticatedUser) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Stakeholder> list(@RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only stakeholders from their workspaces.
        if (projectId != null) return repo.findByProjectIdScopedToUser(projectId, userId);
        return repo.findAllScopedToUser(userId);
    }

    @GetMapping("/{id}")
    public Stakeholder get(@PathVariable String id) { return repo.findById(id).orElseThrow(); }

    @PostMapping
    public Stakeholder create(@Valid @RequestBody Stakeholder s) {
        s.setId("STK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        s.setCreatedBy(authenticatedUser.id());
        s.setCreatedAt(OffsetDateTime.now());
        s.setUpdatedAt(OffsetDateTime.now());
        return repo.save(s);
    }

    @PutMapping("/{id}")
    public Stakeholder update(@PathVariable String id, @Valid @RequestBody Stakeholder updated) {
        return repo.findById(id).map(s -> {
            s.setName(updated.getName());
            s.setRole(updated.getRole());
            s.setOrganization(updated.getOrganization());
            s.setEmail(updated.getEmail());
            s.setInfluence(updated.getInfluence());
            s.setInterest(updated.getInterest());
            s.setEngagementStrategy(updated.getEngagementStrategy());
            s.setCommunicationFreq(updated.getCommunicationFreq());
            s.setLastContactedAt(updated.getLastContactedAt());
            s.setNotes(updated.getNotes());
            s.setUpdatedAt(OffsetDateTime.now());
            return repo.save(s);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        repo.findById(id).ifPresent(s -> { s.setDeletedAt(OffsetDateTime.now()); repo.save(s); });
        return ResponseEntity.noContent().build();
    }
}
