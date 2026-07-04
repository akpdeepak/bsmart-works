package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/risks")
public class RiskController {

    private final RiskRepository riskRepo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public RiskController(RiskRepository riskRepo, AuthenticatedUser authenticatedUser,
                          RbacGate rbac) {
        this.riskRepo = riskRepo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<Risk> list(@RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only risks from their workspaces.
        if (projectId != null) return riskRepo.findByProjectIdScopedToUser(projectId, userId); {
        return riskRepo.findAllScopedToUser(userId);
        }
    }

    @GetMapping("/{id}")
    public Risk get(@PathVariable String id) {
        Risk risk = riskRepo.findById(id).orElseThrow();
        String wsId = rbac.workspaceForProject(risk.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Risk", id);
        }
        return risk;
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
        Risk existing = riskRepo.findById(id).orElseThrow(() -> ApiException.notFound("Risk", id));
        String wsId = rbac.workspaceForProject(existing.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Risk", id);
        }
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
            String wsId = rbac.workspaceForProject(r.getProjectId());
            if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
                throw ApiException.notFound("Risk", id);
            }
            r.setDeletedAt(OffsetDateTime.now());
            riskRepo.save(r);
        });
        return ResponseEntity.noContent().build();
    }
}
