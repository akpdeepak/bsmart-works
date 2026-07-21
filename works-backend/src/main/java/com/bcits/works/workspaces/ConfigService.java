package com.bcits.works.workspaces;

import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * The configuration framework core (iteration 17, Cap R — Universal Customization Engine). Owns the
 * single mutation path for a workspace's live config: manual settings edits, template application,
 * sandbox promotion, import, and rollback all funnel through {@link #update} so that EVERY change is
 * versioned (append-only history), audited (an event in the immutable log), and checked against
 * locked settings — uniformly, with no way to mutate config behind the engine's back.
 *
 * <p>Authorization is applied by the controller via {@link RbacGate} (RB-10 §2): reading config
 * needs workspace membership, writing needs {@code manage_workspace}. Lockable settings add a second
 * gate enforced here, server-side (RB-40 §1 — privacy/locks enforced at the API, never the UI): a
 * path listed in the document's {@code locks} — or the lock set itself — can only be changed by a
 * workspace OWNER, so a compliance-bound customer's admin cannot quietly override a locked policy.
 * Every access is workspace-scoped (RB-40 §1).
 */
@Service
public class ConfigService {

    /** How a version came to be — recorded on each version row and in the audit event. */
    public enum Source { MANUAL, IMPORT, TEMPLATE, ROLLBACK, SANDBOX_PROMOTE }

    static final int OWNER_TIER = 5;

    private final WorkspaceConfigRepository configRepo;
    private final ConfigVersionRepository versionRepo;
    private final ConfigDiffService diffService;
    private final EventService eventService;
    private final ObjectMapper mapper = new ObjectMapper();

    public ConfigService(WorkspaceConfigRepository configRepo, ConfigVersionRepository versionRepo,
                         ConfigDiffService diffService, EventService eventService) {
        this.configRepo = configRepo;
        this.versionRepo = versionRepo;
        this.diffService = diffService;
        this.eventService = eventService;
    }

    // ── Reads ────────────────────────────────────────────────────────────────

    /** The live config row, or a transient default (version 0) when the workspace has none yet. */
    public WorkspaceConfig getLive(String workspaceId) {
        return configRepo.findById(workspaceId).orElseGet(() -> {
            WorkspaceConfig c = new WorkspaceConfig();
            c.setWorkspaceId(workspaceId);
            c.setDocument(ConfigDefaults.DOCUMENT);
            c.setCurrentVersion(0);
            return c;
        });
    }

    /** The live document JSON (defaults when none configured). */
    public String getLiveDocument(String workspaceId) {
        return getLive(workspaceId).getDocument();
    }

    public List<ConfigVersion> listVersions(String workspaceId) {
        return versionRepo.findByWorkspaceIdOrderByVersionNumberDesc(workspaceId);
    }

    public ConfigVersion getVersion(String workspaceId, int versionNumber) {
        return versionRepo.findByWorkspaceIdAndVersionNumber(workspaceId, versionNumber)
                .orElseThrow(() -> ApiException.notFound("Config version", String.valueOf(versionNumber)));
    }

    /**
     * Diff two versions. A version number of 0 (or null) means "current live document", so the UI can
     * compare any historical version against what is live right now.
     */
    public List<ConfigDiffService.ConfigChange> diffVersions(String workspaceId, Integer from, Integer to) {
        String fromDoc = documentForVersion(workspaceId, from);
        String toDoc = documentForVersion(workspaceId, to);
        return diffService.diff(fromDoc, toDoc);
    }

    private String documentForVersion(String workspaceId, Integer version) {
        if (version == null || version == 0) {
            return getLiveDocument(workspaceId);
        }
        return getVersion(workspaceId, version).getDocument();
    }

    // ── The single mutation path ───────────────────────────────────────────────

    /**
     * Apply a new document as the workspace's live config: validate it, enforce locks, append an
     * immutable version, update the live row, and audit. {@code userTier} is the caller's RBAC tier
     * (used only for the owner-gated lock check; the coarse manage_workspace gate is the controller's).
     */
    public WorkspaceConfig update(String workspaceId, String newDocument, String userId, int userTier,
                                  Source source, String summary) {
        String normalized = normalize(newDocument);
        WorkspaceConfig live = getLive(workspaceId);
        enforceLocks(live.getDocument(), normalized, userTier);

        int nextVersion = (live.getCurrentVersion() == null ? 0 : live.getCurrentVersion()) + 1;
        OffsetDateTime now = OffsetDateTime.now();

        ConfigVersion version = new ConfigVersion();
        version.setId(newId());
        version.setWorkspaceId(workspaceId);
        version.setVersionNumber(nextVersion);
        version.setDocument(normalized);
        version.setSummary(summary);
        version.setSource(source.name());
        version.setCreatedBy(userId);
        version.setCreatedAt(now);
        versionRepo.save(version);

        live.setWorkspaceId(workspaceId);
        live.setDocument(normalized);
        live.setCurrentVersion(nextVersion);
        live.setUpdatedBy(userId);
        live.setUpdatedAt(now);
        WorkspaceConfig saved = configRepo.save(live);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("version", nextVersion);
        payload.put("source", source.name());
        payload.put("summary", summary == null ? "" : summary);
        eventService.recordInWorkspace(workspaceId, workspaceId, "CONFIG_UPDATED", userId, payload);
        return saved;
    }

    /** Roll the live config back to a prior version by replaying its document through {@link #update}. */
    public WorkspaceConfig rollback(String workspaceId, int targetVersion, String userId, int userTier) {
        ConfigVersion target = getVersion(workspaceId, targetVersion);
        return update(workspaceId, target.getDocument(), userId, userTier,
                Source.ROLLBACK, "Rolled back to version " + targetVersion);
    }

    // ── Locks ──────────────────────────────────────────────────────────────────

    /**
     * Reject a change that touches a locked path (or the lock set itself) unless the caller is a
     * workspace OWNER. Lock scoping is prefix-based: locking {@code settings.branding} locks every
     * field beneath it.
     */
    private void enforceLocks(String currentDoc, String newDoc, int userTier) {
        if (userTier >= OWNER_TIER) {
            return;
        }
        Set<String> locked = lockedPaths(currentDoc);
        // Changing the set of locked paths is itself owner-only (comparing the resolved sets, so
        // merely re-sending or omitting an unchanged `locks` array is not treated as a change).
        if (!locked.equals(lockedPaths(newDoc))) {
            throw ApiException.forbidden("Only a workspace owner can lock or unlock settings.");
        }
        for (ConfigDiffService.ConfigChange change : diffService.diff(currentDoc, newDoc)) {
            String path = change.path();
            for (String lockedPath : locked) {
                if (path.equals(lockedPath) || path.startsWith(lockedPath + ".")) {
                    throw ApiException.forbidden(
                            "Setting '" + lockedPath + "' is locked. Only a workspace owner can change it.");
                }
            }
        }
    }

    private Set<String> lockedPaths(String documentJson) {
        Set<String> paths = new LinkedHashSet<>();
        try {
            JsonNode locks = mapper.readTree(documentJson).path("locks");
            if (locks.isArray()) {
                locks.forEach(n -> {
                    if (n.isTextual() && !n.asText().isBlank()) {
                        paths.add(n.asText());
                    }
                });
            }
        } catch (Exception ignored) {
            // A malformed document has no enforceable locks; the normalize step rejects it on write.
        }
        return paths;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Parse to canonical JSON and require a top-level object; reject anything else at the boundary. */
    private String normalize(String documentJson) {
        try {
            JsonNode node = mapper.readTree(documentJson == null || documentJson.isBlank() ? "{}" : documentJson);
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

    private String newId() {
        return "CV-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
    }
}
