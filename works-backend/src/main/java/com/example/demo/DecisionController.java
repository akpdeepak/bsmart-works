package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/decisions")
public class DecisionController {

    private final DecisionRepository decisionRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;

    public DecisionController(DecisionRepository decisionRepository, EventService eventService, AuthenticatedUser authenticatedUser) {
        this.decisionRepository = decisionRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Decision> getDecisions(@RequestParam(required = false) String projectId) {
        return projectId != null
            ? decisionRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
            : decisionRepository.findAll();
    }

    @GetMapping("/{id}")
    public Decision getDecision(@PathVariable String id) {
        return decisionRepository.findById(id).orElseThrow();
    }

    @PostMapping
    public Decision createDecision(@RequestBody Decision decision) {
        String userId = authenticatedUser.id();
        decision.setId("DEC-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        decision.setStatus(decision.getStatus() != null ? decision.getStatus() : "ACTIVE");
        decision.setCreatedBy(userId);
        decision.setCreatedAt(OffsetDateTime.now());
        decision.setUpdatedAt(OffsetDateTime.now());
        Decision saved = decisionRepository.save(decision);
        eventService.record(saved.getId(), "DECISION_CREATED", userId, "{\"title\":\"" + saved.getTitle() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public Decision updateDecision(@PathVariable String id, @RequestBody Decision updated) {
        String userId = authenticatedUser.id();
        return decisionRepository.findById(id).map(d -> {
            d.setTitle(updated.getTitle());
            d.setDecisionText(updated.getDecisionText());
            d.setAlternativesConsidered(updated.getAlternativesConsidered());
            d.setRationale(updated.getRationale());
            d.setDecidedAt(updated.getDecidedAt());
            d.setOwnerId(updated.getOwnerId());
            d.setSupportingLinks(updated.getSupportingLinks());
            d.setRelatedRiskIds(updated.getRelatedRiskIds());
            d.setStatus(updated.getStatus());
            d.setUpdatedAt(OffsetDateTime.now());
            Decision saved = decisionRepository.save(d);
            eventService.record(id, "DECISION_UPDATED", userId, "{\"status\":\"" + saved.getStatus() + "\"}");
            return saved;
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDecision(@PathVariable String id) {
        decisionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
