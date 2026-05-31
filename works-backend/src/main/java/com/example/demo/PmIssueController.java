package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/pm-issues")
public class PmIssueController {

    private final PmIssueRepository pmIssueRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;

    public PmIssueController(PmIssueRepository pmIssueRepository, EventService eventService, AuthenticatedUser authenticatedUser) {
        this.pmIssueRepository = pmIssueRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<PmIssue> getPmIssues(@RequestParam(required = false) String projectId) {
        return projectId != null
            ? pmIssueRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
            : pmIssueRepository.findAll();
    }

    @GetMapping("/{id}")
    public PmIssue getPmIssue(@PathVariable String id) {
        return pmIssueRepository.findById(id).orElseThrow();
    }

    @PostMapping
    public PmIssue createPmIssue(@RequestBody PmIssue issue) {
        String userId = authenticatedUser.id();
        issue.setId("ISS-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        issue.setStatus(issue.getStatus() != null ? issue.getStatus() : "OPEN");
        issue.setSeverity(issue.getSeverity() != null ? issue.getSeverity() : "MEDIUM");
        issue.setCreatedBy(userId);
        issue.setCreatedAt(OffsetDateTime.now());
        issue.setUpdatedAt(OffsetDateTime.now());
        PmIssue saved = pmIssueRepository.save(issue);
        eventService.record(saved.getId(), "PM_ISSUE_CREATED", userId, "{\"title\":\"" + saved.getTitle() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public PmIssue updatePmIssue(@PathVariable String id, @RequestBody PmIssue updated) {
        String userId = authenticatedUser.id();
        return pmIssueRepository.findById(id).map(i -> {
            i.setTitle(updated.getTitle());
            i.setProblem(updated.getProblem());
            i.setImpact(updated.getImpact());
            i.setResolutionPath(updated.getResolutionPath());
            i.setStatus(updated.getStatus());
            i.setSeverity(updated.getSeverity());
            i.setOwnerId(updated.getOwnerId());
            i.setUpdatedAt(OffsetDateTime.now());
            PmIssue saved = pmIssueRepository.save(i);
            eventService.record(id, "PM_ISSUE_UPDATED", userId, "{\"status\":\"" + saved.getStatus() + "\"}");
            return saved;
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePmIssue(@PathVariable String id) {
        pmIssueRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
