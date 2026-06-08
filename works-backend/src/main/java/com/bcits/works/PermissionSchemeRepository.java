package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PermissionSchemeRepository extends JpaRepository<PermissionScheme, String> {
    List<PermissionScheme> findByWorkspaceId(String workspaceId);

    /** Workspace-scoped fallback (RB-40 §1): schemes visible only in the caller's workspaces. */
    @Query(nativeQuery = true,
           value = "SELECT * FROM permission_scheme " +
                   "WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<PermissionScheme> findAllScopedToUser(@Param("userId") String userId);
}
