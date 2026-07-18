package com.bcits.works.workspaces;

import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Universal Customization Engine API (iteration 17, Cap R). One configuration surface per workspace —
 * the centralized settings document plus its version history, diff, rollback, JSON/YAML import-export,
 * and pre-apply impact analysis. RBAC is applied here via {@link RbacGate} (the decision logic
 * lives in the service layer, RB-10 §2): reading config needs workspace membership
 * ({@code view_items}); writing needs {@code manage_workspace}; lockable settings add a second,
 * owner-only gate enforced inside {@link ConfigService}. Every call is workspace-scoped (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/config")
public class ConfigController {

    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;
    private final ConfigService config;
    private final ConfigImpactService impact;
    private final ConfigSerializationService serialization;

    public ConfigController(AuthenticatedUser authenticatedUser, RbacGate rbac, ConfigService config,
                            ConfigImpactService impact, ConfigSerializationService serialization) {
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.config = config;
        this.impact = impact;
        this.serialization = serialization;
    }

    // ── Live settings ──────────────────────────────────────────────────────────

    @GetMapping("/settings")
    public WorkspaceConfig settings(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return config.getLive(workspaceId);
    }

    public record UpdateRequest(String document, String summary) { }

    @PutMapping("/settings")
    public WorkspaceConfig updateSettings(@RequestParam String workspaceId, @Valid @RequestBody UpdateRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_workspace");
        int tier = rbac.getUserTier(userId, workspaceId);
        return config.update(workspaceId, req.document(), userId, tier,
                ConfigService.Source.MANUAL, req.summary());
    }

    // ── Versioning, diff, rollback ───────────────────────────────────────────────

    @GetMapping("/versions")
    public List<ConfigVersion> versions(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return config.listVersions(workspaceId);
    }

    @GetMapping("/versions/{versionNumber}")
    public ConfigVersion version(@RequestParam String workspaceId, @PathVariable int versionNumber) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return config.getVersion(workspaceId, versionNumber);
    }

    @GetMapping("/diff")
    public List<ConfigDiffService.ConfigChange> diff(@RequestParam String workspaceId,
                                                     @RequestParam(required = false) Integer from,
                                                     @RequestParam(required = false) Integer to) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return config.diffVersions(workspaceId, from, to);
    }

    public record RollbackRequest(int version) { }

    @PostMapping("/rollback")
    public WorkspaceConfig rollback(@RequestParam String workspaceId, @Valid @RequestBody RollbackRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_workspace");
        int tier = rbac.getUserTier(userId, workspaceId);
        return config.rollback(workspaceId, req.version(), userId, tier);
    }

    // ── Impact analysis (preview, no mutation) ───────────────────────────────────

    @PostMapping("/impact")
    public ConfigImpactService.ImpactReport impact(@RequestParam String workspaceId,
                                                   @Valid @RequestBody UpdateRequest req) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_workspace");
        return impact.analyze(workspaceId, req.document());
    }

    // ── Import / export ──────────────────────────────────────────────────────────

    public record ExportResult(String format, String content) { }

    @GetMapping("/export")
    public ExportResult export(@RequestParam String workspaceId,
                               @RequestParam(defaultValue = "json") String format) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_workspace");
        ConfigSerializationService.Format fmt = ConfigSerializationService.parseFormat(format);
        return new ExportResult(fmt.name().toLowerCase(),
                serialization.export(config.getLiveDocument(workspaceId), fmt));
    }

    public record ImportRequest(String content, String format, String summary) { }

    @PostMapping("/import")
    public WorkspaceConfig importConfig(@RequestParam String workspaceId, @Valid @RequestBody ImportRequest req) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_workspace");
        int tier = rbac.getUserTier(userId, workspaceId);
        ConfigSerializationService.Format fmt = ConfigSerializationService.parseFormat(req.format());
        String document = serialization.importToJson(req.content(), fmt);
        String summary = req.summary() == null || req.summary().isBlank()
                ? "Imported configuration (" + fmt.name().toLowerCase() + ")" : req.summary();
        return config.update(workspaceId, document, userId, tier, ConfigService.Source.IMPORT, summary);
    }

    // ── Extension-point catalog (definitions only; execution is sandboxed/out of scope) ─────────

    @GetMapping("/extension-points")
    public List<ConfigExtensionPoints.ExtensionPoint> extensionPoints(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return ConfigExtensionPoints.CATALOG;
    }
}
