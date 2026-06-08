package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface StakeholderRepository extends JpaRepository<Stakeholder, String> {
    List<Stakeholder> findByProjectIdAndDeletedAtIsNull(String projectId);

    /** Workspace-scoped fallback (RB-40 §1): only stakeholders in workspaces the caller belongs to. */
    @Query(nativeQuery = true,
           value = "SELECT * FROM stakeholder WHERE deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<Stakeholder> findAllScopedToUser(@Param("userId") String userId);

    @Query(nativeQuery = true,
           value = "SELECT * FROM stakeholder WHERE project_id = :projectId AND deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<Stakeholder> findByProjectIdScopedToUser(@Param("projectId") String projectId,
                                                   @Param("userId") String userId);
}
