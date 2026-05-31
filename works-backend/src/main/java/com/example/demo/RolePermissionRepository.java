package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RolePermissionRepository extends JpaRepository<RolePermission, String> {
    List<RolePermission> findByRoleDefId(String roleDefId);
    void deleteByRoleDefId(String roleDefId);
}
