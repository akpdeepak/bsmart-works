package com.example.demo;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/rbac")
public class RbacController {

    private final RbacService rbacService;
    private final JdbcTemplate jdbc;
    private static final String WS = "WS-001";

    public RbacController(RbacService rbacService, JdbcTemplate jdbc) {
        this.rbacService = rbacService;
        this.jdbc = jdbc;
    }

    // Get current user's role and permissions
    @GetMapping("/me")
    public Map<String, Object> myRole(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId == null) userId = "USR-001";
        String role = rbacService.getUserRole(userId, WS);
        int tier    = rbacService.getUserTier(userId, WS);
        List<String> perms = jdbc.queryForList(
            "SELECT id FROM permissions WHERE min_tier <= ?", String.class, tier);
        return Map.of("role", role, "tier", tier, "permissions", perms);
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
            @RequestBody Map<String, String> payload,
            @RequestHeader(value = "X-User-Id", required = false) String callerId) {
        if (callerId == null || !rbacService.canManageRoles(callerId, WS)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Insufficient permissions"));
        }
        String newRole = payload.get("roleId");
        if (newRole == null) return ResponseEntity.badRequest().body(Map.of("error", "roleId required"));

        // Cannot change OWNER role
        String currentRole = rbacService.getUserRole(targetUserId, WS);
        if ("OWNER".equals(currentRole) && !rbacService.isOwner(callerId, WS)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cannot change OWNER role"));
        }

        jdbc.update("UPDATE workspace_members SET role_id = ?, system_role = ? WHERE user_id = ? AND workspace_id = ?",
            newRole, newRole, targetUserId, WS);

        jdbc.update("INSERT INTO role_audit_log (workspace_id, target_user, changed_by, old_role, new_role) VALUES (?,?,?,?,?)",
            WS, targetUserId, callerId, currentRole, newRole);

        return ResponseEntity.ok(Map.of("message", "Role updated", "newRole", newRole));
    }
}
