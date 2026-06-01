package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/risks")
public class RiskController {

    private final RiskRepository riskRepo;
    private final AuthenticatedUser authenticatedUser;

    public RiskController(RiskRepository riskRepo, AuthenticatedUser authenticatedUser) {
        this.riskRepo = riskRepo;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Risk> list(@RequestParam(required = false) String projectId) {
        if (projectId != null) return riskRepo.findByProjectIdAndDeletedAtIsNull(projectId);
        return riskRepo.findAll();
    }

    @GetMapping("/{id}")
    public Risk get(@PathVariable String id) {
        return riskRepo.findById(id).orElseThrow();
    }

    @PostMapping
    public Risk create(@Valid @RequestBody Risk risk) {
        risk.setId("RSK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        risk.setCreatedBy(authenticatedUser.id());
        risk.setCreatedAt(OffsetDateTime.now());
        risk.setUpdatedAt(OffsetDateTime.now());
        return riskRepo.save(risk);
    }

    @PutMapping("/{id}")
    public Risk update(@PathVariable String id, @Valid @RequestBody Risk updated) {
        return riskRepo.findById(id).map(r -> {
            r.setTitle(updated.getTitle());
            r.setDescription(updated.getDescription());
            r.setCategory(updated.getCategory());
            r.setProbability(updated.getProbability());
            r.setImpact(updated.getImpact());
            r.setStatus(updated.getStatus());
            r.setMitigationPlan(updated.getMitigationPlan());
            r.setContingencyPlan(updated.getContingencyPlan());
            r.setOwnerId(updated.getOwnerId());
            r.setReviewDate(updated.getReviewDate());
            r.setRelatedWorkItemId(updated.getRelatedWorkItemId());
            r.setUpdatedAt(OffsetDateTime.now());
            return riskRepo.save(r);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        riskRepo.findById(id).ifPresent(r -> {
            r.setDeletedAt(OffsetDateTime.now());
            riskRepo.save(r);
        });
        return ResponseEntity.noContent().build();
    }
}
