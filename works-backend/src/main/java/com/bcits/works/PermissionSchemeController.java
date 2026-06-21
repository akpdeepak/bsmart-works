package com.bcits.works;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/permission-schemes")
public class PermissionSchemeController {

    private final PermissionSchemeRepository schemeRepo;
    private final RoleDefRepository roleDefRepo;
    private final RolePermissionRepository rolePermRepo;
    private final FieldVisibilityRepository fieldVisRepo;
    private final FieldDefRepository fieldDefRepo;
    private final AuthenticatedUser authenticatedUser;
    private final PermissionSchemeService permissionSchemeService;
    private final RbacService rbac;

    public PermissionSchemeController(PermissionSchemeRepository schemeRepo,
                                       RoleDefRepository roleDefRepo,
                                       RolePermissionRepository rolePermRepo,
                                       FieldVisibilityRepository fieldVisRepo,
                                       FieldDefRepository fieldDefRepo,
                                       AuthenticatedUser authenticatedUser,
                                       PermissionSchemeService permissionSchemeService,
                                       RbacService rbac) {
        this.schemeRepo = schemeRepo;
        this.roleDefRepo = roleDefRepo;
        this.rolePermRepo = rolePermRepo;
        this.fieldVisRepo = fieldVisRepo;
        this.fieldDefRepo = fieldDefRepo;
        this.authenticatedUser = authenticatedUser;
        this.permissionSchemeService = permissionSchemeService;
        this.rbac = rbac;
    }

    @GetMapping
    public List<PermissionScheme> list(@RequestParam(required = false) String workspaceId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only schemes from their workspaces.
        if (workspaceId != null) return schemeRepo.findByWorkspaceId(workspaceId); {
        return schemeRepo.findAllScopedToUser(userId);
        }
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        PermissionScheme scheme = schemeRepo.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), scheme.getWorkspaceId(), "view_items");
        List<RoleDef> roles = roleDefRepo.findByPermissionSchemeId(id);
        List<Map<String, Object>> rolesWithPerms = new ArrayList<>();
        for (RoleDef role : roles) {
            List<RolePermission> perms = rolePermRepo.findByRoleDefId(role.getId());
            Map<String, Object> roleMap = new LinkedHashMap<>();
            roleMap.put("role", role);
            roleMap.put("permissions", perms);
            rolesWithPerms.add(roleMap);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("scheme", scheme);
        result.put("roles", rolesWithPerms);
        return result;
    }

    @PostMapping
    public PermissionScheme create(@Valid @RequestBody PermissionScheme scheme) {
        // Authorize against the target workspace from the body (RB-40 §1, #243 Slice D).
        rbac.require(authenticatedUser.id(), scheme.getWorkspaceId(), "manage_permissions");
        scheme.setId("PS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        scheme.setCreatedAt(OffsetDateTime.now());
        return schemeRepo.save(scheme);
    }

    @PutMapping("/{id}")
    public PermissionScheme update(@PathVariable String id, @Valid @RequestBody PermissionScheme updated) {
        PermissionScheme existing = schemeRepo.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), existing.getWorkspaceId(), "view_items");
        return schemeRepo.findById(id).map(s -> {
            s.setName(updated.getName());
            s.setDescription(updated.getDescription());
            return schemeRepo.save(s);
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        // findById bypasses @Filter (#243 Slice D) — re-check the scheme's workspace before deleting.
        PermissionScheme existing = schemeRepo.findById(id)
                .orElseThrow(() -> ApiException.notFound("PermissionScheme", id));
        rbac.require(authenticatedUser.id(), existing.getWorkspaceId(), "manage_permissions");
        schemeRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // --- Role management ---

    @GetMapping("/roles")
    public List<RoleDef> listRoles(@RequestParam(required = false) String workspaceId) {
        String userId = authenticatedUser.id();
        // Workspace-scoped (RB-40 §1): caller sees only role definitions from their workspaces.
        if (workspaceId != null) return roleDefRepo.findByWorkspaceId(workspaceId); {
        return roleDefRepo.findAllScopedToUser(userId);
        }
    }

    @PostMapping("/roles")
    public RoleDef createRole(@Valid @RequestBody RoleDef role) {
        rbac.require(authenticatedUser.id(), role.getWorkspaceId(), "manage_permissions");
        role.setId("ROLE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        role.setCreatedAt(OffsetDateTime.now());
        return roleDefRepo.save(role);
    }

    @PutMapping("/roles/{id}")
    public RoleDef updateRole(@PathVariable String id, @Valid @RequestBody RoleDef updated) {
        RoleDef existingRole = roleDefRepo.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), existingRole.getWorkspaceId(), "view_items");
        return roleDefRepo.findById(id).map(r -> {
            r.setName(updated.getName());
            r.setDescription(updated.getDescription());
            r.setTier(updated.getTier());
            return roleDefRepo.save(r);
        }).orElseThrow();
    }

    @DeleteMapping("/roles/{id}")
    public ResponseEntity<Void> deleteRole(@PathVariable String id) {
        permissionSchemeService.deleteRole(id);
        return ResponseEntity.noContent().build();
    }

    // Set permissions for a role (replaces all)
    @PutMapping("/roles/{id}/permissions")
    public List<RolePermission> setPermissions(@PathVariable String id,
                                                @Valid @RequestBody List<Map<String, Object>> permissions) {
        return permissionSchemeService.setPermissions(id, permissions);
    }

    // Get permissions matrix: all roles × all known permissions
    @GetMapping("/matrix")
    public Map<String, Object> getMatrix(@RequestParam String workspaceId) {
        List<RoleDef> roles = roleDefRepo.findByWorkspaceId(workspaceId);
        List<String> allPermissions = Arrays.asList(
            "create_items", "edit_items", "delete_items", "view_items",
            "manage_sprints", "manage_projects", "invite_members", "manage_roles",
            "manage_workflows", "manage_fields", "view_reports", "manage_workspace",
            "view_backlog", "manage_backlog", "close_sprint", "reopen_item",
            "manage_permissions", "manage_risk", "manage_meetings", "manage_decisions"
        );
        List<Map<String, Object>> matrix = new ArrayList<>();
        for (RoleDef role : roles) {
            List<RolePermission> perms = rolePermRepo.findByRoleDefId(role.getId());
            Set<String> grantedSet = new HashSet<>();
            perms.stream().filter(p -> Boolean.TRUE.equals(p.getGranted())).forEach(p -> grantedSet.add(p.getPermission()));
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("role", role);
            Map<String, Boolean> permMap = new LinkedHashMap<>();
            allPermissions.forEach(p -> permMap.put(p, grantedSet.contains(p)));
            row.put("permissions", permMap);
            matrix.add(row);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("roles", roles);
        result.put("allPermissions", allPermissions);
        result.put("matrix", matrix);
        return result;
    }

    // Field visibility rules.
    //
    // These rows ARE the field-level-security control (RB-40 §1): a HIDDEN/READ_ONLY rule decides who
    // may see or edit a field. Authoring or reading them must be gated on `manage_permissions` for the
    // owning workspace — otherwise any authenticated user could tamper with another tenant's FLS rules
    // (privilege escalation / control bypass). The owning workspace is derived from the field_def
    // (reads) or the role_def (writes), both of which carry workspace_id and are themselves
    // workspace-filtered (RB-40 §1). FLS Slice 3.

    @GetMapping("/field-visibility/{fieldDefId}")
    public List<FieldVisibility> getFieldVisibility(@PathVariable String fieldDefId) {
        FieldDef fieldDef = fieldDefRepo.findById(fieldDefId).orElseThrow();
        rbac.require(authenticatedUser.id(), fieldDef.getWorkspaceId(), "manage_permissions");
        return fieldVisRepo.findByFieldDefId(fieldDefId);
    }

    @PutMapping("/field-visibility/{fieldDefId}/{roleDefId}")
    public FieldVisibility setFieldVisibility(@PathVariable String fieldDefId,
                                               @PathVariable String roleDefId,
                                               @Valid @RequestBody Map<String, String> body) {
        RoleDef roleDef = roleDefRepo.findById(roleDefId).orElseThrow();
        FieldDef fieldDef = fieldDefRepo.findById(fieldDefId).orElseThrow();
        rbac.require(authenticatedUser.id(), roleDef.getWorkspaceId(), "manage_permissions");
        // The rule binds a field to a role; both must belong to the same workspace so a rule cannot be
        // injected across tenants by pairing one tenant's field with another's role.
        if (!roleDef.getWorkspaceId().equals(fieldDef.getWorkspaceId())) {
            throw ApiException.badRequest("CROSS_WORKSPACE",
                    "Field and role must belong to the same workspace.");
        }
        FieldVisibility fv = fieldVisRepo.findByFieldDefIdAndRoleDefId(fieldDefId, roleDefId)
                .orElseGet(() -> {
                    FieldVisibility newFv = new FieldVisibility();
                    newFv.setId("FV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                    newFv.setFieldDefId(fieldDefId);
                    newFv.setRoleDefId(roleDefId);
                    return newFv;
                });
        fv.setVisibility(body.getOrDefault("visibility", "EDITABLE"));
        return fieldVisRepo.save(fv);
    }

    @DeleteMapping("/field-visibility/rules/{id}")
    public void deleteFieldVisibility(@PathVariable String id) {
        FieldVisibility fv = fieldVisRepo.findById(id).orElseThrow();
        RoleDef roleDef = roleDefRepo.findById(fv.getRoleDefId()).orElseThrow();
        rbac.require(authenticatedUser.id(), roleDef.getWorkspaceId(), "manage_permissions");
        fieldVisRepo.deleteById(id);
    }
}
