package com.bcits.works.projects.api;
import com.bcits.works.workspaces.api.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SprintRepository extends JpaRepository<Sprint, String> {
    List<Sprint> findByProjectIdOrderByCreatedAtDesc(String projectId);
    List<Sprint> findByProjectIdAndStatus(String projectId, String status);

    /** Workspace-scoped full list (RB-40 §1): sprints in projects owned by the caller's workspaces. */
    @Query(nativeQuery = true,
           value = "SELECT s.* FROM sprints s " +
                   "JOIN projects p ON p.id = s.project_id " +
                   "WHERE p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId) " +
                   "ORDER BY s.created_at DESC")
    List<Sprint> findAllScopedToUser(@Param("userId") String userId);

    /** Workspace-scoped per-project list (RB-40 §1). */
    @Query(nativeQuery = true,
           value = "SELECT s.* FROM sprints s " +
                   "JOIN projects p ON p.id = s.project_id " +
                   "WHERE s.project_id = :projectId " +
                   "AND p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId) " +
                   "ORDER BY s.created_at DESC")
    List<Sprint> findByProjectIdScopedToUser(@Param("projectId") String projectId,
                                              @Param("userId") String userId);
}
