package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/rbac")
public class RbacController {

    private final RbacService rbacService;
    private final JdbcTemplate jdbc;
    private final AuthenticatedUser authenticatedUser;

    public RbacController(RbacService rbacService, JdbcTemplate jdbc, AuthenticatedUser authenticatedUser) {
        this.rbacService = rbacService;
        this.jdbc = jdbc;
        this.authenticatedUser = authenticatedUser;
    }

    // Get current user's role and permissions
    @GetMapping("/me")
    public Map<String, Object> myRole(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        String role = rbacService.getUserRole(userId, workspaceId);
        int tier    = rbacService.getUserTier(userId, workspaceId);
        List<String> perms = jdbc.queryForList(
            "SELECT id FROM permissions WHERE min_tier <= ?", String.class, tier);
        // Nav surfaces this tier may see — the front-end uses this to declutter the rail / ⌘K.
        // Authoritative here; the client only falls back to its own copy if this is absent.
        List<String> surfaces = NavSurfaces.visibleFor(tier);
        return Map.of("role", role, "tier", tier, "permissions", perms, "surfaces", surfaces);
    }

    // List all roles
    @GetMapping("/roles")
    public List<Map<String, Object>> getRoles() {
        return jdbc.queryForList("SELECT id, name, description, tier FROM roles ORDER BY tier");
    }

    // Update member role (ADMIN+ only)
    @PutMapping("/members/{targetUserId}/role")
    public ResponseEntity<?> updateRole(
            @PathVariable String targetUserId,
            @Valid @RequestBody Map<String, String> payload) {
        String callerId = authenticatedUser.id();
        String workspaceId = payload.get("workspaceId");
        if (workspaceId == null || workspaceId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "workspaceId required"));
        }
        if (!rbacService.canManageRoles(callerId, workspaceId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Insufficient permissions"));
        }
        String newRole = payload.get("roleId");
        if (newRole == null) return ResponseEntity.badRequest().body(Map.of("error", "roleId required"));

        // Cannot change OWNER role
        String currentRole = rbacService.getUserRole(targetUserId, workspaceId);
        if ("OWNER".equals(currentRole) && !rbacService.isOwner(callerId, workspaceId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cannot change OWNER role"));
        }

        jdbc.update("UPDATE workspace_members SET role_id = ?, system_role = ? WHERE user_id = ? AND workspace_id = ?",
            newRole, newRole, targetUserId, workspaceId);

        jdbc.update("INSERT INTO role_audit_log (workspace_id, target_user, changed_by, old_role, new_role) VALUES (?,?,?,?,?)",
            workspaceId, targetUserId, callerId, currentRole, newRole);

        return ResponseEntity.ok(Map.of("message", "Role updated", "newRole", newRole));
    }
}
