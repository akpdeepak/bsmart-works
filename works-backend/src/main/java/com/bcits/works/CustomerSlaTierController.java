package com.bcits.works;

import jakarta.validation.Valid;
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

import java.util.List;
import java.util.Map;

/**
 * Customer SLA tiers (iteration 9, Cap M): per-workspace response/resolution targets per tier
 * (Platinum / Gold / Silver). Workspace-scoped CRUD — reads require membership, mutations require
 * {@code manage_service}. Targets here drive every new request's countdown via
 * {@link ServiceRequestService}.
 */
@RestController
@RequestMapping("/api/v1/service/sla-tiers")
public class CustomerSlaTierController {

    private final CustomerSlaTierRepository tiers;
    private final CustomerSlaTierService tierService;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public CustomerSlaTierController(CustomerSlaTierRepository tiers, CustomerSlaTierService tierService,
                                     EventService eventService, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.tiers = tiers;
        this.tierService = tierService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<CustomerSlaTier> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return tiers.findByWorkspaceIdOrderByResolutionMinutesAsc(workspaceId);
    }

    @PostMapping
    public CustomerSlaTier create(@Valid @RequestBody CustomerSlaTier tier) {
        String userId = authenticatedUser.id();
        if (tier.getWorkspaceId() == null || tier.getWorkspaceId().isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, tier.getWorkspaceId(), "manage_service");
        if (tier.getTier() == null || tier.getTier().isBlank()) {
            throw ApiException.badRequest("TIER_REQUIRED", "A tier name is required.", "tier");
        }
        if (!tierService.hasValidTargets(tier)) {
            throw ApiException.badRequest("INVALID_TARGETS", "Response and resolution minutes must be positive.");
        }
        String normalized = tierService.normalizeTier(tier.getTier());
        tiers.findByWorkspaceIdAndTier(tier.getWorkspaceId(), normalized).ifPresent(t -> {
            throw ApiException.conflict("A tier named " + normalized + " already exists in this workspace.");
        });
        CustomerSlaTier saved = tiers.save(tierService.prepareNew(tier));
        eventService.record(saved.getId(), "SLA_TIER_CREATED", userId,
                Map.of("tier", safe(saved.getTier()), "workspaceId", safe(saved.getWorkspaceId())));
        return saved;
    }

    @PutMapping("/{id}")
    public CustomerSlaTier update(@PathVariable String id, @Valid @RequestBody CustomerSlaTier updated) {
        String userId = authenticatedUser.id();
        CustomerSlaTier existing = tiers.findById(id)
                .orElseThrow(() -> ApiException.notFound("SLA tier", id));
        rbac.require(userId, existing.getWorkspaceId(), "manage_service");
        CustomerSlaTier saved = tiers.save(tierService.applyUpdate(existing, updated));
        eventService.record(saved.getId(), "SLA_TIER_UPDATED", userId, Map.of("tier", safe(saved.getTier())));
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        CustomerSlaTier existing = tiers.findById(id)
                .orElseThrow(() -> ApiException.notFound("SLA tier", id));
        rbac.require(userId, existing.getWorkspaceId(), "manage_service");
        tiers.deleteById(id);
        eventService.record(id, "SLA_TIER_DELETED", userId, Map.of("tier", safe(existing.getTier())));
        return ResponseEntity.noContent().build();
    }

    private static String safe(String s) { return s == null ? "" : s; }
}
