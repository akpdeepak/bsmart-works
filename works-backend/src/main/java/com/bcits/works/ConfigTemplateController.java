package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Configuration templates API (iteration 17, Cap R) — save the current config as a reusable template
 * and apply templates to onboard new workspaces. RBAC via {@link RbacService} (RB-10 §2): listing
 * needs membership ({@code view_items}); saving, applying and deleting need {@code manage_workspace}.
 * Applying runs through {@link ConfigService} so it is versioned, audited and lock-checked. Every
 * call is workspace-scoped (RB-40 §1) — private templates never cross tenants.
 */
@RestController
@RequestMapping("/api/v1/config/templates")
public class ConfigTemplateController {

    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final ConfigTemplateService templates;

    public ConfigTemplateController(AuthenticatedUser authenticatedUser, RbacService rbac,
                                    ConfigTemplateService templates) {
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.templates = templates;
    }

    @GetMapping
    public List<ConfigTemplate> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return templates.list(workspaceId);
    }

    public record SaveTemplateRequest(String name, String description, boolean shareable) { }

    @PostMapping
    public ConfigTemplate save(@RequestParam String workspaceId, @Valid @RequestBody SaveTemplateRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_workspace");
        return templates.saveCurrentAsTemplate(workspaceId, req.name(), req.description(),
                req.shareable(), userId);
    }

    @PostMapping("/{templateId}/apply")
    public WorkspaceConfig apply(@RequestParam String workspaceId, @PathVariable String templateId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_workspace");
        int tier = rbac.getUserTier(userId, workspaceId);
        return templates.apply(templateId, workspaceId, userId, tier);
    }

    @DeleteMapping("/{templateId}")
    public void delete(@RequestParam String workspaceId, @PathVariable String templateId) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_workspace");
        templates.delete(templateId, workspaceId);
    }
}
