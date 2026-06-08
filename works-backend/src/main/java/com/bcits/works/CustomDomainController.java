package com.bcits.works;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Custom domain management API (B14).
 *
 * <p>Workspace-scoped (RB-40 §1): every endpoint derives the workspace from the authenticated user's
 * request parameter. RBAC is enforced here at the HTTP boundary (RB-10 §2): reads require
 * {@code view_items}; mutations (register, verify, delete) require the {@code ADMIN} system role
 * via {@code manage_workspace}. Business logic lives in {@link CustomDomainService}.
 *
 * <p>DNS / SSL provisioning happens in production after this API is deployed. The {@code POST /{id}/verify}
 * endpoint is intentionally stubbed — it simulates a successful verification so the full lifecycle
 * is exercisable before production DNS is configured.
 */
@Tag(name = "Custom Domains", description = "Workspace-owned custom domain registration, verification, and lifecycle management (DNS hookup deferred to production)")
@RestController
@RequestMapping("/api/v1/custom-domains")
public class CustomDomainController {

    private final CustomDomainService domainService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public CustomDomainController(CustomDomainService domainService,
                                   AuthenticatedUser authenticatedUser,
                                   RbacService rbac) {
        this.domainService = domainService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    // ── List ──────────────────────────────────────────────────────────────────────────────

    @Operation(
        summary = "List custom domains",
        description = "Returns all live custom domains registered for the given workspace. Requires view_items. Soft-deleted domains are excluded.")
    @GetMapping
    public List<CustomDomain> list(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return domainService.list(workspaceId);
    }

    // ── Register ─────────────────────────────────────────────────────────────────────────

    @Operation(
        summary = "Register a custom domain",
        description = "Registers a new custom domain for the workspace (status: PENDING). Validates domain format and rejects wildcards. Requires ADMIN (manage_workspace) role.")
    @PostMapping
    public CustomDomain register(@RequestParam String workspaceId,
                                  @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_workspace");

        String domain = body == null ? null : body.get("domain");
        if (domain == null || domain.isBlank()) {
            throw ApiException.badRequest("DOMAIN_REQUIRED", "A domain name is required.", "domain");
        }

        return domainService.register(workspaceId, domain, userId);
    }

    // ── Verify ───────────────────────────────────────────────────────────────────────────

    @Operation(
        summary = "Trigger domain verification",
        description = "Initiates DNS verification for a registered domain (currently stubbed — transitions to VERIFIED immediately). In production this will check a DNS TXT record. Requires ADMIN (manage_workspace) role.")
    @PostMapping("/{id}/verify")
    public CustomDomain verify(@PathVariable String id, @RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_workspace");
        return domainService.verify(id, workspaceId);
    }

    // ── Delete ───────────────────────────────────────────────────────────────────────────

    @Operation(
        summary = "Delete a custom domain",
        description = "Soft-deletes a custom domain. The domain string is freed for re-registration. Requires ADMIN (manage_workspace) role.")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_workspace");
        domainService.delete(id, workspaceId);
        return ResponseEntity.noContent().build();
    }
}
