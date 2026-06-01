package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/pm-issues")
public class PmIssueController {

    private final PmIssueRepository repo;
    private final AuthenticatedUser authenticatedUser;

    public PmIssueController(PmIssueRepository repo, AuthenticatedUser authenticatedUser) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<PmIssue> list(@RequestParam(required = false) String projectId) {
        if (projectId != null) return repo.findByProjectIdAndDeletedAtIsNull(projectId);
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public PmIssue get(@PathVariable String id) { return repo.findById(id).orElseThrow(); }

    @PostMapping
    public PmIssue create(@Valid @RequestBody PmIssue issue) {
        issue.setId("PMI-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        issue.setCreatedBy(authenticatedUser.id());
        issue.setCreatedAt(OffsetDateTime.now());
        issue.setUpdatedAt(OffsetDateTime.now());
        return repo.save(issue);
    }

    @PutMapping("/{id}")
    public PmIssue update(@PathVariable String id, @Valid @RequestBody PmIssue updated) {
        return repo.findById(id).map(i -> {
            i.setTitle(updated.getTitle());
            i.setDescription(updated.getDescription());
            i.setImpact(updated.getImpact());
            i.setResolutionPath(updated.getResolutionPath());
            i.setStatus(updated.getStatus());
            i.setPriority(updated.getPriority());
            i.setOwnerId(updated.getOwnerId());
            i.setUpdatedAt(OffsetDateTime.now());
            return repo.save(i);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        repo.findById(id).ifPresent(i -> { i.setDeletedAt(OffsetDateTime.now()); repo.save(i); });
        return ResponseEntity.noContent().build();
    }
}
