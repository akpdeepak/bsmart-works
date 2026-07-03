package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Sandbox mode (iteration 17, Cap R) — a labelled draft configuration where changes are tested
 * before promotion, so experimentation never breaks production. A sandbox forks the current live
 * document; edits stay isolated until {@link #promote} replays the draft through
 * {@link ConfigService#update} (versioned, audited, lock-checked). Every access is workspace-scoped
 * and id lookups are workspace-bound (RB-40 §1) — a sandbox cannot be read or promoted across tenants.
 */
@Service
public class ConfigSandboxService {

    private final ConfigSandboxRepository sandboxRepo;
    private final ConfigService configService;
    private final ObjectMapper mapper = new ObjectMapper();

    public ConfigSandboxService(ConfigSandboxRepository sandboxRepo, ConfigService configService) {
        this.sandboxRepo = sandboxRepo;
        this.configService = configService;
    }

    public List<ConfigSandbox> list(String workspaceId) {
        return sandboxRepo.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }

    public ConfigSandbox get(String id, String workspaceId) {
        return sandboxRepo.findByIdAndWorkspaceId(id, workspaceId)
                .orElseThrow(() -> ApiException.notFound("Sandbox", id));
    }

    /** Create a sandbox forked from the workspace's current live config. */
    public ConfigSandbox create(String workspaceId, String name, String userId) {
        if (name == null || name.isBlank()) {
            throw ApiException.badRequest("INVALID_SANDBOX", "A sandbox name is required.", "name");
        }
        WorkspaceConfig live = configService.getLive(workspaceId);
        OffsetDateTime now = OffsetDateTime.now();
        ConfigSandbox s = new ConfigSandbox();
        s.setId("SBX-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        s.setWorkspaceId(workspaceId);
        s.setName(name.trim());
        s.setDocument(live.getDocument());
        s.setBaseVersion(live.getCurrentVersion());
        s.setStatus("DRAFT");
        s.setCreatedBy(userId);
        s.setCreatedAt(now);
        s.setUpdatedAt(now);
        return sandboxRepo.save(s);
    }

    /** Replace a draft sandbox's document. Only a DRAFT sandbox can be edited. */
    public ConfigSandbox update(String id, String workspaceId, String document) {
        ConfigSandbox s = get(id, workspaceId);
        requireDraft(s);
        s.setDocument(validate(document));
        s.setUpdatedAt(OffsetDateTime.now());
        return sandboxRepo.save(s);
    }

    /** Promote a draft to live config (a new SANDBOX_PROMOTE version), then mark it PROMOTED. */
    public WorkspaceConfig promote(String id, String workspaceId, String userId, int userTier) {
        ConfigSandbox s = get(id, workspaceId);
        requireDraft(s);
        WorkspaceConfig result = configService.update(workspaceId, s.getDocument(), userId, userTier,
                ConfigService.Source.SANDBOX_PROMOTE, "Promoted sandbox '" + s.getName() + "'");
        s.setStatus("PROMOTED");
        s.setUpdatedAt(OffsetDateTime.now());
        sandboxRepo.save(s);
        return result;
    }

    public ConfigSandbox discard(String id, String workspaceId) {
        ConfigSandbox s = get(id, workspaceId);
        if (!"DRAFT".equals(s.getStatus())) {
            throw ApiException.badRequest("SANDBOX_NOT_DRAFT", "Only a draft sandbox can be discarded.");
        }
        s.setStatus("DISCARDED");
        s.setUpdatedAt(OffsetDateTime.now());
        return sandboxRepo.save(s);
    }

    private void requireDraft(ConfigSandbox s) {
        if (!"DRAFT".equals(s.getStatus())) {
            throw ApiException.badRequest("SANDBOX_NOT_DRAFT",
                    "This sandbox is " + s.getStatus().toLowerCase() + " and can no longer be changed.");
        }
    }

    private String validate(String document) {
        try {
            JsonNode node = mapper.readTree(document == null || document.isBlank() ? "{}" : document);
            if (node == null || !node.isObject()) {
                throw ApiException.badRequest("INVALID_CONFIG", "Configuration must be a JSON object.");
            }
            return mapper.writeValueAsString(node);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_CONFIG", "Configuration is not valid JSON.");
        }
    }
}
