package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * B21: SCIM 2.0 server skeleton (iteration 19, Cap T — enterprise security). Allows IdPs (Okta,
 * Azure AD, etc.) to provision, update, and deprovision users in a workspace via the SCIM 2.0
 * protocol. Every endpoint is workspace-scoped via a SCIM bearer token that maps to exactly one
 * workspace (RB-40 §1). Responses follow the minimal SCIM 2.0 User schema.
 *
 * <p>Auth: {@code Authorization: Bearer <raw-scim-token>}. The token hash is looked up in
 * {@code scim_tokens} — entirely separate from the JWT auth used by the main API, so SCIM
 * clients never need a user session.
 */
@RestController
@RequestMapping("/scim/v2")
public class ScimController {

    private static final Logger log = LoggerFactory.getLogger(ScimController.class);
    private static final String SCIM_CONTENT_TYPE = "application/scim+json";
    private static final List<String> SCIM_SCHEMAS_USER = List.of("urn:ietf:params:scim:schemas:core:2.0:User");
    private static final List<String> SCIM_SCHEMAS_LIST = List.of("urn:ietf:params:scim:api:messages:2.0:ListResponse");

    private final ScimTokenRepository scimTokens;
    private final UserRepository users;
    private final JdbcTemplate jdbc;
    private final EventService eventService;

    public ScimController(ScimTokenRepository scimTokens, UserRepository users,
                          JdbcTemplate jdbc, EventService eventService) {
        this.scimTokens = scimTokens;
        this.users = users;
        this.jdbc = jdbc;
        this.eventService = eventService;
    }

    // ── Users ──────────────────────────────────────────────────────────────────────

    /** GET /scim/v2/Users — list all users in the workspace. */
    @GetMapping(value = "/Users", produces = SCIM_CONTENT_TYPE)
    public ResponseEntity<Map<String, Object>> listUsers(HttpServletRequest req,
                                                          @RequestParam(defaultValue = "1") int startIndex,
                                                          @RequestParam(defaultValue = "100") int count) {
        String workspaceId = resolveWorkspace(req);
        List<Map<String, Object>> resources = jdbc.query(
            "SELECT u.id, u.email, u.full_name, wm.system_role "
            + "FROM users u JOIN workspace_members wm ON wm.user_id = u.id "
            + "WHERE wm.workspace_id = ? ORDER BY u.full_name ASC LIMIT ? OFFSET ?",
            (rs, row) -> scimUser(rs.getString("id"), rs.getString("email"),
                rs.getString("full_name"), true),
            workspaceId, Math.min(count, 200), Math.max(0, startIndex - 1));
        return ok(listResponse(resources, resources.size(), startIndex));
    }

    /** POST /scim/v2/Users — provision a new user and add to the workspace. */
    @PostMapping(value = "/Users", consumes = SCIM_CONTENT_TYPE, produces = SCIM_CONTENT_TYPE)
    public ResponseEntity<Map<String, Object>> createUser(HttpServletRequest req,
                                                           @RequestBody Map<String, Object> body) {
        String workspaceId = resolveWorkspace(req);
        String userName = str(body.get("userName"));
        if (userName == null || userName.isBlank()) {
            return scimError(400, "userName is required");
        }
        String displayName = extractDisplayName(body);
        // Find-or-create the user by email
        String email = userName; // SCIM userName is conventionally email
        Optional<User> existing = users.findByEmail(email);
        User user;
        if (existing.isPresent()) {
            user = existing.get();
        } else {
            user = new User();
            user.setId("USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            user.setEmail(email);
            user.setFullName(displayName);
            user.setPasswordHash(""); // provisioned user — password set via invite flow
            user.setEmailVerified(true); // IdP-provisioned users are pre-verified
            users.save(user);
            log.info("[SCIM] Provisioned new user {} in workspace {}", user.getId(), workspaceId);
        }
        // Add to workspace if not already a member
        jdbc.update("INSERT INTO workspace_members (workspace_id, user_id, system_role) "
            + "VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
            workspaceId, user.getId(), "MEMBER");
        eventService.recordInWorkspace(workspaceId, user.getId(), "SCIM_USER_PROVISIONED",
            "system:scim", Map.of("email", email, "workspaceId", workspaceId));
        return ResponseEntity.status(201)
            .contentType(org.springframework.http.MediaType.parseMediaType(SCIM_CONTENT_TYPE))
            .body(scimUser(user.getId(), user.getEmail(), user.getFullName(), true));
    }

    /** PUT /scim/v2/Users/{id} — update an existing user's display name / active state. */
    @PutMapping(value = "/Users/{id}", consumes = SCIM_CONTENT_TYPE, produces = SCIM_CONTENT_TYPE)
    public ResponseEntity<Map<String, Object>> updateUser(HttpServletRequest req,
                                                           @PathVariable String id,
                                                           @RequestBody Map<String, Object> body) {
        String workspaceId = resolveWorkspace(req);
        // Verify the user belongs to this workspace
        requireInWorkspace(workspaceId, id);
        User user = users.findById(id).orElseThrow(() -> ApiException.notFound("User", id));
        String displayName = extractDisplayName(body);
        if (displayName != null && !displayName.isBlank()) {
            user.setFullName(displayName);
        }
        users.save(user);
        Object active = body.get("active");
        if (Boolean.FALSE.equals(active)) {
            // Deactivate = remove from workspace (soft — user record stays)
            jdbc.update("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
                workspaceId, id);
            eventService.recordInWorkspace(workspaceId, id, "SCIM_USER_DEACTIVATED",
                "system:scim", Map.of("workspaceId", workspaceId));
        }
        boolean isActive = isWorkspaceMember(workspaceId, id);
        return ok(scimUser(user.getId(), user.getEmail(), user.getFullName(), isActive));
    }

    /** DELETE /scim/v2/Users/{id} — soft-delete: remove from workspace, preserve user record. */
    @DeleteMapping(value = "/Users/{id}", produces = SCIM_CONTENT_TYPE)
    public ResponseEntity<Void> deleteUser(HttpServletRequest req, @PathVariable String id) {
        String workspaceId = resolveWorkspace(req);
        requireInWorkspace(workspaceId, id);
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
            workspaceId, id);
        eventService.recordInWorkspace(workspaceId, id, "SCIM_USER_DEPROVISIONED",
            "system:scim", Map.of("workspaceId", workspaceId));
        log.info("[SCIM] Deprovisioned user {} from workspace {}", id, workspaceId);
        return ResponseEntity.noContent().build();
    }

    // ── Groups ─────────────────────────────────────────────────────────────────────

    /** GET /scim/v2/Groups — list workspace roles/groups. */
    @GetMapping(value = "/Groups", produces = SCIM_CONTENT_TYPE)
    public ResponseEntity<Map<String, Object>> listGroups(HttpServletRequest req) {
        String workspaceId = resolveWorkspace(req);
        List<Map<String, Object>> resources = jdbc.query(
            "SELECT id, name FROM roles ORDER BY name ASC",
            (rs, row) -> scimGroup(rs.getString("id"), rs.getString("name"), workspaceId));
        return ok(listResponse(resources, resources.size(), 1));
    }

    // ── Token management (admin API) ───────────────────────────────────────────────

    /**
     * POST /scim/v2/tokens — issue a new SCIM token for a workspace. Returns the raw token
     * once; only the hash is stored. Requires a valid JWT (admin action).
     */
    @PostMapping(value = "/tokens", produces = "application/json")
    public ResponseEntity<Map<String, Object>> issueToken(
            @RequestParam String workspaceId,
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest req) {
        // Must be authenticated via JWT for token issuance (admin action)
        String callerId = (String) req.getAttribute("authenticatedUserId");
        if (callerId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        String rawToken = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        String hash = sha256(rawToken);
        ScimToken token = new ScimToken();
        token.setId("SCIM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        token.setWorkspaceId(workspaceId);
        token.setTokenHash(hash);
        token.setLabel(body != null ? str(body.get("label")) : null);
        token.setCreatedBy(callerId);
        token.setCreatedAt(OffsetDateTime.now());
        scimTokens.save(token);
        eventService.recordInWorkspace(workspaceId, token.getId(), "SCIM_TOKEN_ISSUED",
            callerId, Map.of("tokenId", token.getId()));
        // Return the raw token once — it will never be recoverable after this response
        return ResponseEntity.status(201).body(Map.of(
            "tokenId", token.getId(),
            "token", rawToken,
            "workspaceId", workspaceId,
            "label", token.getLabel() != null ? token.getLabel() : "",
            "warning", "Store this token securely — it will not be shown again."));
    }

    // ── Internal helpers ──────────────────────────────────────────────────────────

    /** Resolve workspaceId from the SCIM Bearer token. Throws 401 if missing/invalid. */
    private String resolveWorkspace(HttpServletRequest req) {
        String authHeader = req.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw ApiException.unauthorized("Bearer token required.");
        }
        String raw = authHeader.substring(7).trim();
        String hash = sha256(raw);
        ScimToken token = scimTokens.findByTokenHashAndRevokedAtIsNull(hash)
            .orElseThrow(() -> ApiException.unauthorized("Invalid or revoked SCIM token."));
        // Touch last_used_at asynchronously (fire-and-forget, non-blocking)
        try {
            jdbc.update("UPDATE scim_tokens SET last_used_at = NOW() WHERE id = ?", token.getId());
        } catch (Exception ignored) { /* non-critical */ }
        return token.getWorkspaceId();
    }

    private void requireInWorkspace(String workspaceId, String userId) {
        if (!isWorkspaceMember(workspaceId, userId)) {
            throw ApiException.notFound("User", userId); // don't leak cross-workspace user existence
        }
    }

    private boolean isWorkspaceMember(String workspaceId, String userId) {
        Integer n = jdbc.queryForObject(
            "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
            Integer.class, workspaceId, userId);
        return n != null && n > 0;
    }

    private Map<String, Object> scimUser(String id, String email, String fullName, boolean active) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("schemas", SCIM_SCHEMAS_USER);
        m.put("id", id);
        m.put("externalId", id);
        m.put("userName", email);
        // SCIM name sub-object
        Map<String, Object> name = new LinkedHashMap<>();
        String display = fullName != null ? fullName : "";
        String[] parts = display.split("\\s+", 2);
        name.put("formatted", display);
        name.put("givenName", parts.length > 0 ? parts[0] : "");
        name.put("familyName", parts.length > 1 ? parts[1] : "");
        m.put("name", name);
        m.put("displayName", display);
        m.put("emails", List.of(Map.of("value", email, "primary", true, "type", "work")));
        m.put("active", active);
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("resourceType", "User");
        meta.put("location", "/scim/v2/Users/" + id);
        m.put("meta", meta);
        return m;
    }

    private Map<String, Object> scimGroup(String id, String name, String workspaceId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("schemas", List.of("urn:ietf:params:scim:schemas:core:2.0:Group"));
        m.put("id", id);
        m.put("displayName", name);
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("resourceType", "Group");
        meta.put("location", "/scim/v2/Groups/" + id);
        m.put("meta", meta);
        return m;
    }

    private Map<String, Object> listResponse(List<Map<String, Object>> resources, int total, int startIndex) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("schemas", SCIM_SCHEMAS_LIST);
        m.put("totalResults", total);
        m.put("startIndex", startIndex);
        m.put("itemsPerPage", resources.size());
        m.put("Resources", resources);
        return m;
    }

    private ResponseEntity<Map<String, Object>> ok(Map<String, Object> body) {
        return ResponseEntity.ok()
            .contentType(org.springframework.http.MediaType.parseMediaType(SCIM_CONTENT_TYPE))
            .body(body);
    }

    private ResponseEntity<Map<String, Object>> scimError(int status, String detail) {
        Map<String, Object> err = Map.of(
            "schemas", List.of("urn:ietf:params:scim:api:messages:2.0:Error"),
            "status", String.valueOf(status),
            "detail", detail);
        return ResponseEntity.status(status)
            .contentType(org.springframework.http.MediaType.parseMediaType(SCIM_CONTENT_TYPE))
            .body(err);
    }

    private String extractDisplayName(Map<String, Object> body) {
        Object nameObj = body.get("name");
        if (nameObj instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> nameMap = (Map<String, Object>) nameObj;
            String formatted = str(nameMap.get("formatted"));
            if (formatted != null && !formatted.isBlank()) return formatted; {
            String given = str(nameMap.get("givenName"));
            }
            String family = str(nameMap.get("familyName"));
            if (given != null || family != null) {
                return (given != null ? given : "") + (family != null ? " " + family : "");
            }
        }
        String displayName = str(body.get("displayName"));
        if (displayName != null && !displayName.isBlank()) return displayName; {
        return str(body.get("userName")); // fallback
        }
    }

    private static String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b)); {
            return sb.toString();
            }
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 unavailable", e);
        }
    }

    private static String str(Object o) { return o == null ? null : o.toString(); }
}
