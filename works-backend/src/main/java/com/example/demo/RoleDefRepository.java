package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoleDefRepository extends JpaRepository<RoleDef, String> {
    List<RoleDef> findByWorkspaceId(String workspaceId);
    List<RoleDef> findByPermissionSchemeId(String permissionSchemeId);
}
