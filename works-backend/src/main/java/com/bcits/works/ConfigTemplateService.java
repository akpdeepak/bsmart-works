package com.bcits.works;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Configuration templates (iteration 17, Cap R) — save a workspace's current config as a reusable
 * template and apply it to another workspace, the basis for template-based customer onboarding. A
 * workspace sees its own templates plus every shareable one; applying a template runs through
 * {@link ConfigService#update} so it is versioned, audited and lock-checked like any other change.
 * Every access is workspace-scoped (RB-40 §1): a template owned privately by one workspace is never
 * visible, applicable, or deletable by another.
 */
@Service
public class ConfigTemplateService {

    private final ConfigTemplateRepository templateRepo;
    private final ConfigService configService;

    public ConfigTemplateService(ConfigTemplateRepository templateRepo, ConfigService configService) {
        this.templateRepo = templateRepo;
        this.configService = configService;
    }

    public List<ConfigTemplate> list(String workspaceId) {
        return templateRepo.findVisibleTo(workspaceId);
    }

    /** Snapshot the workspace's current live config as a new template. */
    public ConfigTemplate saveCurrentAsTemplate(String workspaceId, String name, String description,
                                                boolean shareable, String userId) {
        if (name == null || name.isBlank()) {
            throw ApiException.badRequest("INVALID_TEMPLATE", "A template name is required.", "name");
        }
        ConfigTemplate t = new ConfigTemplate();
        t.setId("TPL-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        t.setOwnerWorkspaceId(workspaceId);
        t.setName(name.trim());
        t.setDescription(description);
        t.setShareable(shareable);
        t.setDocument(configService.getLiveDocument(workspaceId));
        t.setCreatedBy(userId);
        t.setCreatedAt(OffsetDateTime.now());
        return templateRepo.save(t);
    }

    /** Apply a visible template to the workspace's live config (a new TEMPLATE-sourced version). */
    public WorkspaceConfig apply(String templateId, String workspaceId, String userId, int userTier) {
        ConfigTemplate t = visibleOrThrow(templateId, workspaceId);
        return configService.update(workspaceId, t.getDocument(), userId, userTier,
                ConfigService.Source.TEMPLATE, "Applied template '" + t.getName() + "'");
    }

    public void delete(String templateId, String workspaceId) {
        ConfigTemplate t = templateRepo.findById(templateId)
                .orElseThrow(() -> ApiException.notFound("Template", templateId));
        if (!workspaceId.equals(t.getOwnerWorkspaceId())) {
            // Global (owner-null) and other workspaces' templates are not yours to delete.
            throw ApiException.forbidden("You can only delete templates your workspace owns.");
        }
        templateRepo.delete(t);
    }

    /** A template is usable only if shareable or owned by the caller's workspace (RB-40 §1). */
    private ConfigTemplate visibleOrThrow(String templateId, String workspaceId) {
        ConfigTemplate t = templateRepo.findById(templateId)
                .orElseThrow(() -> ApiException.notFound("Template", templateId));
        boolean visible = Boolean.TRUE.equals(t.getShareable())
                || workspaceId.equals(t.getOwnerWorkspaceId());
        if (!visible) {
            throw ApiException.notFound("Template", templateId);
        }
        return t;
    }
}
