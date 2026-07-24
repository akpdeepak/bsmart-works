package com.bcits.works.projects;
import com.bcits.works.workspaces.api.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ReleaseRepository extends JpaRepository<Release, String> {
    List<Release> findByProjectIdOrderByCreatedAtDesc(String projectId);

    /** Workspace-scoped full list (RB-40 §1): releases in projects owned by the caller's workspaces. */
    @Query(nativeQuery = true,
           value = "SELECT r.* FROM releases r " +
                   "JOIN projects p ON p.id = r.project_id " +
                   "WHERE p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId) " +
                   "ORDER BY r.created_at DESC")
    List<Release> findAllScopedToUser(@Param("userId") String userId);

    /** Workspace-scoped per-project list (RB-40 §1). */
    @Query(nativeQuery = true,
           value = "SELECT r.* FROM releases r " +
                   "JOIN projects p ON p.id = r.project_id " +
                   "WHERE r.project_id = :projectId " +
                   "AND p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId) " +
                   "ORDER BY r.created_at DESC")
    List<Release> findByProjectIdScopedToUser(@Param("projectId") String projectId,
                                               @Param("userId") String userId);
}
