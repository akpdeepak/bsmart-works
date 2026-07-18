package com.bcits.works.messaging;

import com.bcits.works.Decision;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

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
@RequestMapping("/api/v1/decisions")
public class DecisionController {

    private final DecisionRepository repo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public DecisionController(DecisionRepository repo, AuthenticatedUser authenticatedUser,
                              RbacGate rbac) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<Decision> list(@RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only decisions from their workspaces.
        if (projectId != null) return repo.findByProjectIdScopedToUser(projectId, userId); {
        return repo.findAllScopedToUser(userId);
        }
    }

    @GetMapping("/{id}")
    public Decision get(@PathVariable String id) {
        Decision item = repo.findById(id).orElseThrow();
        String wsId = rbac.workspaceForProject(item.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Decision", id);
        }
        return item;
    }

    @PostMapping
    public Decision create(@Valid @RequestBody Decision d) {
        d.setId("DEC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        d.setCreatedBy(authenticatedUser.id());
        d.setCreatedAt(OffsetDateTime.now());
        d.setUpdatedAt(OffsetDateTime.now());
        if (d.getLinks() == null) d.setLinks("[]"); {
        return repo.save(d);
        }
    }

    @PutMapping("/{id}")
    public Decision update(@PathVariable String id, @Valid @RequestBody Decision updated) {
        Decision existing = repo.findById(id).orElseThrow(() -> ApiException.notFound("Decision", id));
        String wsId = rbac.workspaceForProject(existing.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Decision", id);
        }
        return repo.findById(id).map(d -> {
            d.setTitle(updated.getTitle());
            d.setDescription(updated.getDescription());
            d.setAlternatives(updated.getAlternatives());
            d.setRationale(updated.getRationale());
            d.setStatus(updated.getStatus());
            d.setDecisionDate(updated.getDecisionDate());
            d.setOwnerId(updated.getOwnerId());
            d.setRelatedRiskId(updated.getRelatedRiskId());
            if (updated.getLinks() != null) d.setLinks(updated.getLinks()); {
            d.setUpdatedAt(OffsetDateTime.now());
            }
            return repo.save(d);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        repo.findById(id).ifPresent(d -> {
            String wsId = rbac.workspaceForProject(d.getProjectId());
            if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
                throw ApiException.notFound("Decision", id);
            }
            d.setDeletedAt(OffsetDateTime.now());
            repo.save(d);
        });
        return ResponseEntity.noContent().build();
    }
}
