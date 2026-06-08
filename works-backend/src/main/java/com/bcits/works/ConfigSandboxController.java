package com.bcits.works;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sandbox mode API (iteration 17, Cap R) — preview config changes in an isolated draft before
 * promoting them to live. RBAC via {@link RbacService} (RB-10 §2): listing/reading needs membership
 * ({@code view_items}); creating, editing, promoting and discarding need {@code manage_workspace}.
 * Promotion runs through {@link ConfigService} (versioned, audited, lock-checked). Every call is
 * workspace-scoped and id lookups are workspace-bound (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/config/sandboxes")
public class ConfigSandboxController {

    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final ConfigSandboxService sandboxes;

    public ConfigSandboxController(AuthenticatedUser authenticatedUser, RbacService rbac,
                                   ConfigSandboxService sandboxes) {
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.sandboxes = sandboxes;
    }

    @GetMapping
    public List<ConfigSandbox> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return sandboxes.list(workspaceId);
    }

    @GetMapping("/{sandboxId}")
    public ConfigSandbox get(@RequestParam String workspaceId, @PathVariable String sandboxId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return sandboxes.get(sandboxId, workspaceId);
    }

    public record CreateSandboxRequest(String name) { }

    @PostMapping
    public ConfigSandbox create(@RequestParam String workspaceId, @RequestBody CreateSandboxRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_workspace");
        return sandboxes.create(workspaceId, req.name(), userId);
    }

    public record UpdateSandboxRequest(String document) { }

    @PutMapping("/{sandboxId}")
    public ConfigSandbox update(@RequestParam String workspaceId, @PathVariable String sandboxId,
                                @RequestBody UpdateSandboxRequest req) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_workspace");
        return sandboxes.update(sandboxId, workspaceId, req.document());
    }

    @PostMapping("/{sandboxId}/promote")
    public WorkspaceConfig promote(@RequestParam String workspaceId, @PathVariable String sandboxId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_workspace");
        int tier = rbac.getUserTier(userId, workspaceId);
        return sandboxes.promote(sandboxId, workspaceId, userId, tier);
    }

    @PostMapping("/{sandboxId}/discard")
    public ConfigSandbox discard(@RequestParam String workspaceId, @PathVariable String sandboxId) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_workspace");
        return sandboxes.discard(sandboxId, workspaceId);
    }
}
