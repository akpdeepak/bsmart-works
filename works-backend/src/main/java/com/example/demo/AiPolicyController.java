package com.example.demo;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The AI Control Plane admin surface (iteration 10, Cap Z): workspace policy (I10-S03), per-capability
 * toggles (I10-S04), model-tier selection (I10-S10) and data-boundary controls (I10-S11). All writes
 * are gated server-side by {@code manage_ai} (ADMIN tier); reads require workspace membership
 * ({@code view_items}). RBAC lives here at the service boundary, never the UI (RB-40 §1). Every
 * mutation is recorded as an event (RB-10 §3).
 */
@RestController
@RequestMapping("/api/v1/ai/policy")
public class AiPolicyController {

    private static final Set<String> MODES = Set.of("ENABLED", "DISABLED", "OPT_IN");
    private static final Set<String> TIERS = Set.of("HAIKU", "SONNET", "OPUS");

    private final AiWorkspacePolicyRepository policies;
    private final AiCapabilityToggleRepository toggles;
    private final AiDataBoundaryRepository boundaries;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public AiPolicyController(AiWorkspacePolicyRepository policies, AiCapabilityToggleRepository toggles,
                             AiDataBoundaryRepository boundaries, EventService eventService,
                             AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.policies = policies;
        this.toggles = toggles;
        this.boundaries = boundaries;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** The full plane config for a workspace: policy + capability toggles + data boundary. */
    @GetMapping
    public Map<String, Object> get(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        AiWorkspacePolicy policy = policies.findByWorkspaceId(workspaceId).orElseGet(() -> defaultPolicy(workspaceId));
        AiDataBoundary boundary = boundaries.findByWorkspaceId(workspaceId).orElseGet(() -> defaultBoundary(workspaceId));
        List<AiCapabilityToggle> caps = toggles.findByWorkspaceId(workspaceId);
        return Map.of("policy", policy, "capabilityToggles", caps, "dataBoundary", boundary);
    }

    /** Set the workspace mode + default model tier (I10-S03 / I10-S10). */
    @PutMapping
    public AiWorkspacePolicy setPolicy(@Valid @RequestBody Map<String, String> body) {
        String workspaceId = required(body, "workspaceId");
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_ai");

        String mode = up(body.getOrDefault("mode", "OPT_IN"));
        if (!MODES.contains(mode)) {
            throw ApiException.badRequest("INVALID_MODE", "mode must be ENABLED, DISABLED or OPT_IN.");
        }
        String tier = up(body.getOrDefault("defaultModelTier", "SONNET"));
        if (!TIERS.contains(tier)) {
            throw ApiException.badRequest("INVALID_TIER", "model tier must be HAIKU, SONNET or OPUS.");
        }
        AiWorkspacePolicy policy = policies.findByWorkspaceId(workspaceId).orElseGet(() -> defaultPolicy(workspaceId));
        policy.setMode(mode);
        policy.setDefaultModelTier(tier);
        policy.setUpdatedBy(userId);
        policy.setUpdatedAt(OffsetDateTime.now());
        AiWorkspacePolicy saved = policies.save(policy);
        eventService.record(workspaceId, "AI_POLICY_UPDATED", userId, Map.of("mode", mode, "tier", tier));
        return saved;
    }

    /** Toggle AI on/off for a single capability (I10-S04). */
    @PutMapping("/capabilities")
    public AiCapabilityToggle setCapability(@Valid @RequestBody Map<String, Object> body) {
        String workspaceId = required(body, "workspaceId");
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_ai");
        String capability = up(String.valueOf(body.getOrDefault("capability", "")));
        if (capability.isBlank()) {
            throw ApiException.badRequest("CAPABILITY_REQUIRED", "capability is required.");
        }
        boolean enabled = !Boolean.FALSE.equals(body.get("enabled"));
        AiCapabilityToggle toggle = toggles.findByWorkspaceIdAndCapability(workspaceId, capability)
            .orElseGet(() -> {
                AiCapabilityToggle t = new AiCapabilityToggle();
                t.setId("AICT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                t.setWorkspaceId(workspaceId);
                t.setCapability(capability);
                return t;
            });
        toggle.setEnabled(enabled);
        toggle.setUpdatedBy(userId);
        toggle.setUpdatedAt(OffsetDateTime.now());
        AiCapabilityToggle saved = toggles.save(toggle);
        eventService.record(workspaceId, "AI_CAPABILITY_TOGGLED", userId,
            Map.of("capability", capability, "enabled", enabled));
        return saved;
    }

    /** Set which data types may leave the server to a model (I10-S11). */
    @PutMapping("/data-boundary")
    public AiDataBoundary setBoundary(@Valid @RequestBody Map<String, Object> body) {
        String workspaceId = required(body, "workspaceId");
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_ai");
        AiDataBoundary boundary = boundaries.findByWorkspaceId(workspaceId).orElseGet(() -> defaultBoundary(workspaceId));
        boundary.setBlockPii(!Boolean.FALSE.equals(body.get("blockPii")));
        boundary.setBlockFinancial(!Boolean.FALSE.equals(body.get("blockFinancial")));
        boundary.setUpdatedBy(userId);
        boundary.setUpdatedAt(OffsetDateTime.now());
        AiDataBoundary saved = boundaries.save(boundary);
        eventService.record(workspaceId, "AI_DATA_BOUNDARY_UPDATED", userId,
            Map.of("blockPii", saved.getBlockPii(), "blockFinancial", saved.getBlockFinancial()));
        return saved;
    }

    // ── helpers ───────────────────────────────────────────────────────────────────

    private AiWorkspacePolicy defaultPolicy(String workspaceId) {
        AiWorkspacePolicy p = new AiWorkspacePolicy();
        p.setWorkspaceId(workspaceId);
        p.setMode("OPT_IN");
        p.setDefaultModelTier("SONNET");
        return p;
    }

    private AiDataBoundary defaultBoundary(String workspaceId) {
        AiDataBoundary b = new AiDataBoundary();
        b.setWorkspaceId(workspaceId);
        b.setBlockPii(true);
        b.setBlockFinancial(true);
        return b;
    }

    private String required(Map<String, ?> body, String key) {
        Object v = body.get(key);
        String s = v == null ? "" : v.toString();
        if (s.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        return s;
    }

    private String up(String s) {
        return s == null ? "" : s.trim().toUpperCase();
    }
}
