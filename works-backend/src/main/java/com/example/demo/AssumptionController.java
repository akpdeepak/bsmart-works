package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/assumptions")
public class AssumptionController {

    private final AssumptionRepository assumptionRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;

    public AssumptionController(AssumptionRepository assumptionRepository, EventService eventService, AuthenticatedUser authenticatedUser) {
        this.assumptionRepository = assumptionRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Assumption> getAssumptions(@RequestParam(required = false) String projectId) {
        return projectId != null
            ? assumptionRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
            : assumptionRepository.findAll();
    }

    @GetMapping("/{id}")
    public Assumption getAssumption(@PathVariable String id) {
        return assumptionRepository.findById(id).orElseThrow();
    }

    @PostMapping
    public Assumption createAssumption(@RequestBody Assumption assumption) {
        String userId = authenticatedUser.id();
        assumption.setId("ASM-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        assumption.setValidationStatus(assumption.getValidationStatus() != null ? assumption.getValidationStatus() : "PENDING");
        assumption.setCreatedBy(userId);
        assumption.setCreatedAt(OffsetDateTime.now());
        assumption.setUpdatedAt(OffsetDateTime.now());
        Assumption saved = assumptionRepository.save(assumption);
        eventService.record(saved.getId(), "ASSUMPTION_CREATED", userId, "{\"title\":\"" + saved.getTitle() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public Assumption updateAssumption(@PathVariable String id, @RequestBody Assumption updated) {
        String userId = authenticatedUser.id();
        return assumptionRepository.findById(id).map(a -> {
            a.setTitle(updated.getTitle());
            a.setRationale(updated.getRationale());
            a.setValidationStatus(updated.getValidationStatus());
            a.setOwnerId(updated.getOwnerId());
            a.setExpiryDate(updated.getExpiryDate());
            a.setNotes(updated.getNotes());
            a.setUpdatedAt(OffsetDateTime.now());
            Assumption saved = assumptionRepository.save(a);
            eventService.record(id, "ASSUMPTION_UPDATED", userId, "{\"status\":\"" + saved.getValidationStatus() + "\"}");
            return saved;
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAssumption(@PathVariable String id) {
        assumptionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
