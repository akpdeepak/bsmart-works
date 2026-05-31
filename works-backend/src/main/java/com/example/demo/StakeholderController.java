package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/stakeholders")
public class StakeholderController {

    private final StakeholderRepository stakeholderRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;

    public StakeholderController(StakeholderRepository stakeholderRepository, EventService eventService, AuthenticatedUser authenticatedUser) {
        this.stakeholderRepository = stakeholderRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Stakeholder> getStakeholders(@RequestParam(required = false) String projectId) {
        return projectId != null
            ? stakeholderRepository.findByProjectIdOrderByNameAsc(projectId)
            : stakeholderRepository.findAll();
    }

    @GetMapping("/{id}")
    public Stakeholder getStakeholder(@PathVariable String id) {
        return stakeholderRepository.findById(id).orElseThrow();
    }

    @PostMapping
    public Stakeholder createStakeholder(@RequestBody Stakeholder stakeholder) {
        String userId = authenticatedUser.id();
        stakeholder.setId("STK-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        stakeholder.setInfluence(stakeholder.getInfluence() != null ? stakeholder.getInfluence() : "MEDIUM");
        stakeholder.setInterest(stakeholder.getInterest() != null ? stakeholder.getInterest() : "MEDIUM");
        stakeholder.setCommunicationFrequency(stakeholder.getCommunicationFrequency() != null ? stakeholder.getCommunicationFrequency() : "MONTHLY");
        stakeholder.setCreatedBy(userId);
        stakeholder.setCreatedAt(OffsetDateTime.now());
        stakeholder.setUpdatedAt(OffsetDateTime.now());
        Stakeholder saved = stakeholderRepository.save(stakeholder);
        eventService.record(saved.getId(), "STAKEHOLDER_CREATED", userId, "{\"name\":\"" + saved.getName() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public Stakeholder updateStakeholder(@PathVariable String id, @RequestBody Stakeholder updated) {
        String userId = authenticatedUser.id();
        return stakeholderRepository.findById(id).map(s -> {
            s.setName(updated.getName());
            s.setRole(updated.getRole());
            s.setEmail(updated.getEmail());
            s.setInfluence(updated.getInfluence());
            s.setInterest(updated.getInterest());
            s.setCommunicationFrequency(updated.getCommunicationFrequency());
            s.setLastContactedAt(updated.getLastContactedAt());
            s.setNotes(updated.getNotes());
            s.setUpdatedAt(OffsetDateTime.now());
            Stakeholder saved = stakeholderRepository.save(s);
            eventService.record(id, "STAKEHOLDER_UPDATED", userId, "{}");
            return saved;
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStakeholder(@PathVariable String id) {
        stakeholderRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
