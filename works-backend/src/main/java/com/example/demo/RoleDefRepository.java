package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface RoleDefRepository extends JpaRepository<RoleDef, String> {
    List<RoleDef> findByWorkspaceId(String workspaceId);
    List<RoleDef> findByPermissionSchemeId(String permissionSchemeId);

    /** Workspace-scoped fallback (RB-40 §1): roles visible only in the caller's workspaces. */
    @Query(nativeQuery = true,
           value = "SELECT * FROM role_def " +
                   "WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<RoleDef> findAllScopedToUser(@Param("userId") String userId);
}
