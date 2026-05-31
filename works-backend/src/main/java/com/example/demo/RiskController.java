package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/risks")
public class RiskController {

    private final RiskRepository riskRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;

    public RiskController(RiskRepository riskRepository, EventService eventService, AuthenticatedUser authenticatedUser) {
        this.riskRepository = riskRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Risk> getRisks(@RequestParam(required = false) String projectId) {
        return projectId != null
            ? riskRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
            : riskRepository.findAll();
    }

    @GetMapping("/{id}")
    public Risk getRisk(@PathVariable String id) {
        return riskRepository.findById(id).orElseThrow();
    }

    @PostMapping
    public Risk createRisk(@RequestBody Risk risk) {
        String userId = authenticatedUser.id();
        risk.setId("RSK-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        risk.setStatus(risk.getStatus() != null ? risk.getStatus() : "OPEN");
        risk.setProbability(risk.getProbability() != null ? risk.getProbability() : "MEDIUM");
        risk.setImpact(risk.getImpact() != null ? risk.getImpact() : "MEDIUM");
        risk.setCreatedBy(userId);
        risk.setCreatedAt(OffsetDateTime.now());
        risk.setUpdatedAt(OffsetDateTime.now());
        Risk saved = riskRepository.save(risk);
        eventService.record(saved.getId(), "RISK_CREATED", userId, "{\"title\":\"" + saved.getTitle() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public Risk updateRisk(@PathVariable String id, @RequestBody Risk updated) {
        String userId = authenticatedUser.id();
        return riskRepository.findById(id).map(r -> {
            r.setTitle(updated.getTitle());
            r.setDescription(updated.getDescription());
            r.setProbability(updated.getProbability());
            r.setImpact(updated.getImpact());
            r.setStatus(updated.getStatus());
            r.setMitigationPlan(updated.getMitigationPlan());
            r.setOwnerId(updated.getOwnerId());
            r.setReviewDate(updated.getReviewDate());
            r.setWorkItemIds(updated.getWorkItemIds());
            r.setUpdatedAt(OffsetDateTime.now());
            Risk saved = riskRepository.save(r);
            eventService.record(id, "RISK_UPDATED", userId, "{\"status\":\"" + saved.getStatus() + "\"}");
            return saved;
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRisk(@PathVariable String id) {
        riskRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/dashboard")
    public Map<String, Object> getRaidDashboard(@RequestParam String projectId) {
        List<Risk> risks = riskRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        long openRisks = risks.stream().filter(r -> "OPEN".equals(r.getStatus())).count();
        long highImpact = risks.stream().filter(r -> "HIGH".equals(r.getImpact()) || "CRITICAL".equals(r.getImpact())).count();
        return Map.of(
            "totalRisks", risks.size(),
            "openRisks", openRisks,
            "highImpactRisks", highImpact,
            "risks", risks
        );
    }
}
