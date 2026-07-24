package com.bcits.works.service;

import com.bcits.works.auth.api.Stakeholder;
import com.bcits.works.auth.api.StakeholderRepository;
import com.bcits.works.security.api.StakeholderPiiService;
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
@RequestMapping("/api/v1/stakeholders")
public class StakeholderController {

    private final StakeholderRepository repo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;
    private final StakeholderPiiService stakeholderPii;

    public StakeholderController(StakeholderRepository repo, AuthenticatedUser authenticatedUser,
                                 RbacGate rbac, StakeholderPiiService stakeholderPii) {
        this.repo = repo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.stakeholderPii = stakeholderPii;
    }

    @GetMapping
    public List<Stakeholder> list(@RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only stakeholders from their workspaces.
        List<Stakeholder> found = projectId != null
                ? repo.findByProjectIdScopedToUser(projectId, userId)
                : repo.findAllScopedToUser(userId);
        // Resolve PII from the vault when reads are switched on (RB-40 §3); legacy column otherwise.
        found.forEach(stakeholderPii::applyDisplay);
        return found;
    }

    @GetMapping("/{id}")
    public Stakeholder get(@PathVariable String id) {
        Stakeholder s = repo.findById(id).orElseThrow();
        String wsId = rbac.workspaceForProject(s.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Stakeholder", id);
        }
        return stakeholderPii.applyDisplay(s);
    }

    @PostMapping
    public Stakeholder create(@Valid @RequestBody Stakeholder s) {
        s.setId("STK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        s.setCreatedBy(authenticatedUser.id());
        s.setCreatedAt(OffsetDateTime.now());
        s.setUpdatedAt(OffsetDateTime.now());
        Stakeholder saved = repo.save(s);
        stakeholderPii.sync(saved); // dual-write name/email/org/notes into the PII vault (RB-40 §3)
        return stakeholderPii.applyDisplay(saved);
    }

    @PutMapping("/{id}")
    public Stakeholder update(@PathVariable String id, @Valid @RequestBody Stakeholder updated) {
        Stakeholder existing = repo.findById(id).orElseThrow(() -> ApiException.notFound("Stakeholder", id));
        String wsId = rbac.workspaceForProject(existing.getProjectId());
        if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
            throw ApiException.notFound("Stakeholder", id);
        }
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
            Stakeholder saved = repo.save(s);
            stakeholderPii.sync(saved); // dual-write the updated PII into the vault (RB-40 §3)
            return stakeholderPii.applyDisplay(saved);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        repo.findById(id).ifPresent(s -> {
            String wsId = rbac.workspaceForProject(s.getProjectId());
            if (wsId == null || rbac.getUserTier(authenticatedUser.id(), wsId) < 1) {
                throw ApiException.notFound("Stakeholder", id);
            }
            s.setDeletedAt(OffsetDateTime.now());
            repo.save(s);
        });
        return ResponseEntity.noContent().build();
    }
}
