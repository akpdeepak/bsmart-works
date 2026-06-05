package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Voluntary individual sharing (iteration 12, Cap L · "Voluntary individual sharing"). An engineer
 * grants specific people read access to their <em>own</em> personal metrics (e.g. for a 1:1). You can
 * only ever share your own data — the owner is always the authenticated user, never a parameter — so
 * there is no path here for one user to expose another's metrics, and no manager/admin override. This
 * is the only mechanism by which {@link KpiPrivacyService#canViewPersonal} returns true for a non-owner.
 */
@RestController
@RequestMapping("/api/v1/metrics/shares")
public class MetricShareController {

    private final MetricShareRepository shares;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public MetricShareController(MetricShareRepository shares, EventService eventService,
                                 AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.shares = shares;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** Shares the current user has granted (people who can see my metrics). */
    @GetMapping
    public List<MetricShare> myGrants() {
        return shares.findByOwnerId(authenticatedUser.id());
    }

    /** People who have shared their metrics with the current user. */
    @GetMapping("/granted-to-me")
    public List<MetricShare> grantedToMe() {
        return shares.findBySharedWithId(authenticatedUser.id());
    }

    /** Grant {@code sharedWithId} access to my personal metrics. Idempotent on (owner, recipient). */
    @PostMapping
    public MetricShare create(@RequestBody Map<String, Object> body) {
        String ownerId = authenticatedUser.id();              // always me — never a parameter
        String workspaceId = str(body.get("workspaceId"));
        String sharedWithId = str(body.get("sharedWithId"));
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        if (sharedWithId == null || sharedWithId.isBlank()) {
            throw ApiException.badRequest("RECIPIENT_REQUIRED", "sharedWithId is required.", "sharedWithId");
        }
        if (sharedWithId.equals(ownerId)) {
            throw ApiException.badRequest("CANNOT_SHARE_WITH_SELF", "You already see your own metrics.");
        }
        rbac.require(ownerId, workspaceId, "view_items"); // both parties are workspace members

        MetricShare share = shares.findByOwnerIdAndSharedWithId(ownerId, sharedWithId).orElseGet(MetricShare::new);
        share.setId(share.getId() != null ? share.getId() : "MS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        share.setWorkspaceId(workspaceId);
        share.setOwnerId(ownerId);
        share.setSharedWithId(sharedWithId);
        share.setExpiresAt(parseExpiry(body.get("expiresAt")));
        if (share.getCreatedAt() == null) {
            share.setCreatedAt(OffsetDateTime.now());
        }
        MetricShare saved = shares.save(share);
        eventService.record(saved.getId(), "METRIC_SHARE_GRANTED", ownerId,
            Map.of("sharedWith", sharedWithId, "workspaceId", workspaceId));
        return saved;
    }

    /** Revoke a share. Only the owner may revoke their own share. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> revoke(@PathVariable String id) {
        String userId = authenticatedUser.id();
        MetricShare share = shares.findById(id).orElseThrow(() -> ApiException.notFound("Metric share", id));
        if (!userId.equals(share.getOwnerId())) {
            throw ApiException.forbidden("Only the owner can revoke this share.");
        }
        shares.deleteById(id);
        eventService.record(id, "METRIC_SHARE_REVOKED", userId, Map.of("sharedWith", safe(share.getSharedWithId())));
        return ResponseEntity.noContent().build();
    }

    private OffsetDateTime parseExpiry(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value.toString());
        } catch (RuntimeException e) {
            throw ApiException.badRequest("INVALID_EXPIRY", "expiresAt must be an ISO-8601 timestamp.", "expiresAt");
        }
    }

    private String str(Object o) { return o == null ? null : o.toString(); }
    private String safe(String s) { return s == null ? "" : s; }
}
