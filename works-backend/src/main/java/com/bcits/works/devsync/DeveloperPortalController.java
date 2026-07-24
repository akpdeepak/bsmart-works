package com.bcits.works.devsync;
import com.bcits.works.auth.ApiTokenService;
import com.bcits.works.workspaces.api.Workspace;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Developer Portal API (iteration 20, Cap R) — documentation, SDK manifest and a sandbox for
 * third-party developers building Works extensions. Self-contained: the SDK manifest is static and the
 * sandbox credential is an ephemeral generated token (no secret is persisted here — persistent public
 * tokens go through ApiTokenService). RBAC at the boundary (RB-10 §2): any member may read the SDK;
 * minting a sandbox credential requires {@code manage_api_tokens}. Workspace-scoped (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/developer-portal")
public class DeveloperPortalController {

    static final String SANDBOX_TOKEN_PREFIX = "wsbx_";
    static final String SANDBOX_BASE_URL = "https://sandbox.api.bsmartworks.dev/api/v1";

    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public DeveloperPortalController(AuthenticatedUser authenticatedUser, RbacGate rbac) {
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** Static SDK manifest describing how to build a Works extension. Browsable by any member. */
    @GetMapping("/sdk")
    public Map<String, Object> sdk(@RequestParam String workspaceId) {
        rbac.require(requireWorkspace(workspaceId), workspaceId, "view_items");
        return Map.of(
            "sdkVersion", "1.0.0",
            "languages", List.of("JavaScript / TypeScript", "Python", "Java"),
            "extensionPoints", List.of(
                Map.of("id", "webhook", "name", "Webhooks",
                    "description", "Receive signed events (item.created, item.updated, comment.added) at your endpoint."),
                Map.of("id", "slash-command", "name", "Slash Commands",
                    "description", "Register custom /commands that call back into your extension."),
                Map.of("id", "panel", "name", "Item Panels",
                    "description", "Render a panel inside the work-item detail view via an iframe surface."),
                Map.of("id", "automation-action", "name", "Automation Actions",
                    "description", "Expose actions usable in the When/If/Then automation engine.")
            ),
            "availableScopes", List.of(
                Map.of("id", "read_items", "description", "Read work items the workspace exposes."),
                Map.of("id", "create_items", "description", "Create new work items."),
                Map.of("id", "edit_any_item", "description", "Edit any work item."),
                Map.of("id", "write_comments", "description", "Post comments on work items."),
                Map.of("id", "manage_projects", "description", "Read and manage projects.")
            ),
            "docs", List.of(
                Map.of("title", "Getting Started", "url", "https://developers.bsmartworks.dev/getting-started"),
                Map.of("title", "Manifest Schema", "url", "https://developers.bsmartworks.dev/manifest"),
                Map.of("title", "Webhook Signing", "url", "https://developers.bsmartworks.dev/webhooks"),
                Map.of("title", "Scopes & Permission Scoping", "url", "https://developers.bsmartworks.dev/scopes")
            ),
            "exampleManifest", Map.of(
                "slug", "my-extension",
                "name", "My Extension",
                "version", "1.0.0",
                "publisher", "Acme Inc",
                "requestedScopes", List.of("read_items", "write_comments"),
                "webhook", Map.of("url", "https://example.com/works/webhook", "events",
                    List.of("item.created", "item.updated")),
                "extensionPoints", List.of("webhook", "panel")
            )
        );
    }

    /**
     * Mints an ephemeral sandbox credential for the workspace's developers. Nothing is persisted — the
     * sandbox is a throwaway environment; production tokens go through ApiTokenService.
     */
    @PostMapping("/sandbox-credentials")
    public Map<String, Object> sandboxCredentials(@RequestParam String workspaceId) {
        String userId = requireWorkspace(workspaceId);
        rbac.require(userId, workspaceId, "manage_api_tokens");
        String token = SANDBOX_TOKEN_PREFIX
            + UUID.randomUUID().toString().replace("-", "")
            + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        return Map.of(
            "sandboxToken", token,
            "sandboxBaseUrl", SANDBOX_BASE_URL,
            "workspaceId", workspaceId,
            "issuedAt", OffsetDateTime.now().toString(),
            "notice", "Sandbox credentials are ephemeral and reset periodically. Do not use in production."
        );
    }

    /** Resolves the caller and rejects a missing workspace before any access (RB-40 §1). */
    private String requireWorkspace(String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        return authenticatedUser.id();
    }
}
