package com.example.demo;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Per-user AI preference (iteration 10, Cap Z / I10-S05). A user toggles AI for themselves within the
 * admin policy bounds (RB-40 §2, most-restrictive-wins — a preference never relaxes a workspace or
 * capability that is off). This is the only AI-plane setting a non-admin may change, and only for
 * their <b>own</b> user id: the authenticated caller is always the subject, so there is no way to set
 * another user's preference. Workspace membership ({@code view_items}) is still required so a caller
 * can only act within a workspace they belong to (tenant isolation, RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/ai/preferences")
public class AiPreferenceController {

    private final AiUserPreferenceRepository preferences;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public AiPreferenceController(AiUserPreferenceRepository preferences, EventService eventService,
                                 AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.preferences = preferences;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** The caller's own preference for a workspace (defaults to "inherit/on" when unset). */
    @GetMapping
    public Map<String, Object> get(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        boolean enabled = preferences.findByWorkspaceIdAndUserId(workspaceId, userId)
            .map(AiUserPreference::getEnabled)
            .orElse(true);
        return Map.of("workspaceId", workspaceId, "userId", userId, "enabled", enabled);
    }

    /** Set the caller's own preference. The subject is always {@code authenticatedUser.id()}. */
    @PutMapping
    public AiUserPreference set(@Valid @RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        Object ws = body.get("workspaceId");
        String workspaceId = ws == null ? "" : ws.toString();
        if (workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, workspaceId, "view_items");
        boolean enabled = !Boolean.FALSE.equals(body.get("enabled"));
        AiUserPreference pref = preferences.findByWorkspaceIdAndUserId(workspaceId, userId)
            .orElseGet(() -> {
                AiUserPreference p = new AiUserPreference();
                p.setId("AIUP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                p.setWorkspaceId(workspaceId);
                p.setUserId(userId);
                return p;
            });
        pref.setEnabled(enabled);
        pref.setUpdatedAt(OffsetDateTime.now());
        AiUserPreference saved = preferences.save(pref);
        eventService.record(workspaceId, "AI_USER_PREFERENCE_SET", userId, Map.of("enabled", enabled));
        return saved;
    }
}
