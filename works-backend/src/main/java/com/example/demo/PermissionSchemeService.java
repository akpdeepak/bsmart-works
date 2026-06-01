package com.example.demo;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PermissionSchemeService {

    private final RoleDefRepository roleDefRepo;
    private final RolePermissionRepository rolePermRepo;

    public PermissionSchemeService(RoleDefRepository roleDefRepo,
                                   RolePermissionRepository rolePermRepo) {
        this.roleDefRepo = roleDefRepo;
        this.rolePermRepo = rolePermRepo;
    }

    @Transactional
    public void deleteRole(String roleId) {
        rolePermRepo.deleteByRoleDefId(roleId);
        roleDefRepo.deleteById(roleId);
    }

    @Transactional
    public List<RolePermission> setPermissions(String roleId, List<Map<String, Object>> permissions) {
        rolePermRepo.deleteByRoleDefId(roleId);
        List<RolePermission> saved = new ArrayList<>();
        for (Map<String, Object> perm : permissions) {
            RolePermission rp = new RolePermission();
            rp.setId("RP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            rp.setRoleDefId(roleId);
            rp.setPermission((String) perm.get("permission"));
            rp.setGranted(perm.get("granted") == null || Boolean.TRUE.equals(perm.get("granted")));
            saved.add(rolePermRepo.save(rp));
        }
        return saved;
    }
}
