package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

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
 * Public-API token management (iteration 13, Cap Q). Issuing, listing and revoking tokens all
 * require {@code manage_api_tokens}. The plaintext token is returned exactly once, at issue time.
 * RBAC at the service boundary (RB-10 §2), every endpoint workspace-scoped (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/api-tokens")
public class ApiTokenController {

    private final ApiTokenService apiTokens;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ApiTokenController(ApiTokenService apiTokens, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.apiTokens = apiTokens;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<ApiToken> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_api_tokens");
        return apiTokens.list(workspaceId);
    }

    public record IssueRequest(String name, List<String> scopes) { }

    /** Issues a token; the plaintext is present in this response only and never again. */
    @PostMapping
    public Map<String, Object> issue(@RequestParam String workspaceId, @RequestBody IssueRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_api_tokens");
        ApiTokenService.IssuedToken issued = apiTokens.issue(workspaceId, userId,
            req == null ? null : req.name(), req == null ? null : req.scopes());
        return Map.of("token", issued.token(), "plaintext", issued.plaintext(),
            "notice", "Copy this token now — it will not be shown again.");
    }

    @PostMapping("/{id}/revoke")
    public ApiToken revoke(@RequestParam String workspaceId, @PathVariable String id) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_api_tokens");
        return apiTokens.revoke(workspaceId, id);
    }

    /** Rotates a token: revokes the current one and issues a new token with the same name and scopes. */
    @PostMapping("/{id}/rotate")
    public Map<String, Object> rotate(@RequestParam String workspaceId, @PathVariable String id) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_api_tokens");
        ApiTokenService.IssuedToken issued = apiTokens.rotate(workspaceId, id, userId);
        return Map.of("token", issued.token(), "plaintext", issued.plaintext(),
            "notice", "Copy this token now — it will not be shown again.");
    }
}
