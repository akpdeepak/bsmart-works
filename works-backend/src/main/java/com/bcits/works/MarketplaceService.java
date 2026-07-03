package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * App Marketplace (iteration 20, Cap R) — the catalog of installable extensions and the per-workspace
 * installs. The catalog itself is GLOBAL (any workspace may browse PUBLISHED listings), but every
 * write is bounded:
 *
 *   • publish/edit — a workspace may only mutate a listing it owns ({@code publisherWorkspaceId}).
 *   • install      — granted scopes must be a subset of the listing's requested scopes (permission
 *                    scoping); duplicate installs are rejected.
 *   • install/uninstall/enable — all workspace-scoped (RB-40 §1); an install that does not belong to
 *                    the caller's workspace is invisible (notFound), never mutable across tenants.
 *
 * RBAC is applied by the caller (MarketplaceController) at the controller→service boundary (RB-10 §2);
 * state changes are recorded to the append-only audit log (RB-20 §5).
 */
@Service
public class MarketplaceService {

    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String STATUS_DRAFT = "DRAFT";

    private final MarketplaceListingRepository listings;
    private final InstalledExtensionRepository installs;
    private final EventService events;

    public MarketplaceService(MarketplaceListingRepository listings,
                              InstalledExtensionRepository installs,
                              EventService events) {
        this.listings = listings;
        this.installs = installs;
        this.events = events;
    }

    // ── Catalog browse (global, read-only) ───────────────────────────────────

    /** All PUBLISHED listings — the browsable catalog, visible to any workspace. */
    public List<MarketplaceListing> listPublished() {
        return listings.findByStatusOrderByNameAsc(STATUS_PUBLISHED);
    }

    public MarketplaceListing getListing(String id) {
        return listings.findById(id).orElseThrow(() -> ApiException.notFound("Listing", id));
    }

    // ── Publishing (own listings only) ───────────────────────────────────────

    public record ListingInput(String slug, String name, String summary, String category,
                               String publisher, String version, String icon,
                               List<String> requestedScopes, String status) { }

    @Transactional
    public MarketplaceListing publish(String workspaceId, String userId, ListingInput in) {
        if (in == null || in.name() == null || in.name().isBlank()) {
            throw ApiException.badRequest("MISSING_NAME", "Listing name is required.", "name");
        }
        if (in.slug() == null || in.slug().isBlank()) {
            throw ApiException.badRequest("MISSING_SLUG", "Listing slug is required.", "slug");
        }
        listings.findBySlug(in.slug().trim()).ifPresent(existing -> {
            throw ApiException.conflict("A listing with that slug already exists.");
        });
        MarketplaceListing l = new MarketplaceListing();
        l.setId("MKT-" + shortId());
        l.setPublisherWorkspaceId(workspaceId);
        l.setCreatedAt(OffsetDateTime.now());
        apply(l, in);
        MarketplaceListing saved = listings.save(l);
        events.recordInWorkspace(workspaceId, saved.getId(), "MARKETPLACE_LISTING_PUBLISHED", userId,
            Map.of("listingId", saved.getId(), "slug", saved.getSlug(), "status", saved.getStatus()));
        return saved;
    }

    @Transactional
    public MarketplaceListing updateListing(String workspaceId, String userId, String id, ListingInput in) {
        MarketplaceListing l = getListing(id);
        if (!workspaceId.equals(l.getPublisherWorkspaceId())) {
            throw ApiException.forbidden("This listing belongs to a different workspace.");
        }
        if (in == null || in.name() == null || in.name().isBlank()) {
            throw ApiException.badRequest("MISSING_NAME", "Listing name is required.", "name");
        }
        apply(l, in);
        MarketplaceListing saved = listings.save(l);
        events.recordInWorkspace(workspaceId, saved.getId(), "MARKETPLACE_LISTING_UPDATED", userId,
            Map.of("listingId", saved.getId(), "status", saved.getStatus()));
        return saved;
    }

    private void apply(MarketplaceListing l, ListingInput in) {
        l.setSlug(in.slug() == null ? l.getSlug() : in.slug().trim());
        l.setName(in.name().trim());
        l.setSummary(in.summary());
        l.setCategory(in.category());
        l.setPublisher(in.publisher());
        l.setVersion(in.version());
        l.setIcon(in.icon());
        l.setRequestedScopes(joinScopes(in.requestedScopes()));
        l.setStatus(STATUS_PUBLISHED.equals(in.status()) ? STATUS_PUBLISHED : STATUS_DRAFT);
        l.setUpdatedAt(OffsetDateTime.now());
    }

    // ── Installs (workspace-scoped) ──────────────────────────────────────────

    public List<InstalledExtension> listInstalled(String workspaceId) {
        return installs.findByWorkspaceIdOrderByInstalledAtDesc(workspaceId);
    }

    @Transactional
    public InstalledExtension install(String workspaceId, String userId, String listingId,
                                      List<String> grantedScopes) {
        MarketplaceListing listing = getListing(listingId);
        if (!STATUS_PUBLISHED.equals(listing.getStatus())) {
            throw ApiException.badRequest("LISTING_NOT_PUBLISHED",
                "Only published listings can be installed.");
        }
        installs.findByWorkspaceIdAndListingId(workspaceId, listingId).ifPresent(existing -> {
            throw ApiException.conflict("This extension is already installed.");
        });
        Set<String> requested = parseScopes(listing.getRequestedScopes());
        Set<String> granted = new LinkedHashSet<>(grantedScopes == null ? List.of() : grantedScopes);
        granted.removeIf(s -> s == null || s.isBlank());
        // Permission scoping: an admin may only grant scopes the extension actually requested.
        for (String s : granted) {
            if (!requested.contains(s)) {
                throw ApiException.badRequest("SCOPE_NOT_REQUESTED",
                    "Scope '" + s + "' was not requested by this extension.");
            }
        }
        InstalledExtension ext = new InstalledExtension();
        ext.setId("EXT-" + shortId());
        ext.setWorkspaceId(workspaceId);
        ext.setListingId(listingId);
        ext.setGrantedScopes(String.join(",", granted));
        ext.setEnabled(true);
        ext.setInstalledBy(userId);
        ext.setInstalledAt(OffsetDateTime.now());
        InstalledExtension saved = installs.save(ext);
        events.recordInWorkspace(workspaceId, saved.getId(), "EXTENSION_INSTALLED", userId,
            Map.of("listingId", listingId, "grantedScopes", saved.getGrantedScopes()));
        return saved;
    }

    @Transactional
    public InstalledExtension setEnabled(String workspaceId, String userId, String installId, boolean enabled) {
        InstalledExtension ext = requireOwned(workspaceId, installId);
        ext.setEnabled(enabled);
        InstalledExtension saved = installs.save(ext);
        events.recordInWorkspace(workspaceId, saved.getId(),
            enabled ? "EXTENSION_ENABLED" : "EXTENSION_DISABLED", userId,
            Map.of("listingId", saved.getListingId(), "enabled", enabled));
        return saved;
    }

    @Transactional
    public void uninstall(String workspaceId, String userId, String installId) {
        InstalledExtension ext = requireOwned(workspaceId, installId);
        installs.delete(ext);
        events.recordInWorkspace(workspaceId, ext.getId(), "EXTENSION_UNINSTALLED", userId,
            Map.of("listingId", ext.getListingId()));
    }

    /** Loads an install scoped to the workspace — a cross-tenant install is invisible (notFound). */
    private InstalledExtension requireOwned(String workspaceId, String installId) {
        return installs.findByWorkspaceIdAndId(workspaceId, installId)
            .orElseThrow(() -> ApiException.notFound("Installed extension", installId));
    }

    // ── Pure helpers ─────────────────────────────────────────────────────────

    static Set<String> parseScopes(String csv) {
        if (csv == null || csv.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(csv.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    static String joinScopes(List<String> scopes) {
        if (scopes == null) {
            return "";
        }
        return scopes.stream()
            .filter(s -> s != null && !s.isBlank())
            .map(String::trim)
            .distinct()
            .collect(Collectors.joining(","));
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 12);
    }
}
