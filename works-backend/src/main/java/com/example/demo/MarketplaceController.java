package com.example.demo;

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
 * App Marketplace API (iteration 20, Cap R). The catalog is global-browsable, but every endpoint is
 * still workspace-scoped and RBAC-gated at this boundary (RB-10 §2, RB-40 §1) using existing
 * permissions only:
 *   • browse / read       → {@code view_items}
 *   • install / uninstall / enable / publish → {@code manage_integrations}
 * The service enforces permission scoping (granted ⊆ requested) and the cross-tenant guard on installs.
 */
@RestController
@RequestMapping("/api/v1/marketplace")
public class MarketplaceController {

    private final MarketplaceService marketplace;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public MarketplaceController(MarketplaceService marketplace, AuthenticatedUser authenticatedUser,
                                 RbacService rbac) {
        this.marketplace = marketplace;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    // ── Catalog ──────────────────────────────────────────────────────────────

    @GetMapping("/listings")
    public List<MarketplaceListing> listings(@RequestParam String workspaceId) {
        rbac.require(requireWorkspace(workspaceId), workspaceId, "view_items");
        return marketplace.listPublished();
    }

    @GetMapping("/listings/{id}")
    public MarketplaceListing listing(@RequestParam String workspaceId, @PathVariable String id) {
        rbac.require(requireWorkspace(workspaceId), workspaceId, "view_items");
        return marketplace.getListing(id);
    }

    @PostMapping("/listings")
    public MarketplaceListing publish(@RequestParam String workspaceId,
                                      @RequestBody MarketplaceService.ListingInput req) {
        String userId = requireWorkspace(workspaceId);
        rbac.require(userId, workspaceId, "manage_integrations");
        return marketplace.publish(workspaceId, userId, req);
    }

    @PutMapping("/listings/{id}")
    public MarketplaceListing updateListing(@RequestParam String workspaceId, @PathVariable String id,
                                            @RequestBody MarketplaceService.ListingInput req) {
        String userId = requireWorkspace(workspaceId);
        rbac.require(userId, workspaceId, "manage_integrations");
        return marketplace.updateListing(workspaceId, userId, id, req);
    }

    // ── Installs ─────────────────────────────────────────────────────────────

    @GetMapping("/installed")
    public List<InstalledExtension> installed(@RequestParam String workspaceId) {
        rbac.require(requireWorkspace(workspaceId), workspaceId, "view_items");
        return marketplace.listInstalled(workspaceId);
    }

    public record InstallRequest(String listingId, List<String> grantedScopes) { }

    @PostMapping("/install")
    public InstalledExtension install(@RequestParam String workspaceId, @RequestBody InstallRequest req) {
        String userId = requireWorkspace(workspaceId);
        rbac.require(userId, workspaceId, "manage_integrations");
        if (req == null || req.listingId() == null || req.listingId().isBlank()) {
            throw ApiException.badRequest("MISSING_LISTING", "listingId is required.", "listingId");
        }
        return marketplace.install(workspaceId, userId, req.listingId(), req.grantedScopes());
    }

    public record EnabledRequest(Boolean enabled) { }

    @PutMapping("/installed/{id}/enabled")
    public InstalledExtension setEnabled(@RequestParam String workspaceId, @PathVariable String id,
                                         @RequestBody EnabledRequest req) {
        String userId = requireWorkspace(workspaceId);
        rbac.require(userId, workspaceId, "manage_integrations");
        boolean enabled = req != null && Boolean.TRUE.equals(req.enabled());
        return marketplace.setEnabled(workspaceId, userId, id, enabled);
    }

    @DeleteMapping("/installed/{id}")
    public Map<String, Object> uninstall(@RequestParam String workspaceId, @PathVariable String id) {
        String userId = requireWorkspace(workspaceId);
        rbac.require(userId, workspaceId, "manage_integrations");
        marketplace.uninstall(workspaceId, userId, id);
        return Map.of("uninstalled", true, "id", id);
    }

    /** Resolves the caller and rejects a missing workspace before any data access (RB-40 §1). */
    private String requireWorkspace(String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        return authenticatedUser.id();
    }
}
