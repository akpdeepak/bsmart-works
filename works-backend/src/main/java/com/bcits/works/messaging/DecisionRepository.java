package com.bcits.works.messaging;
import com.bcits.works.workspaces.api.Workspace;

import com.bcits.works.shared.api.Decision;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DecisionRepository extends JpaRepository<Decision, String> {
    List<Decision> findByProjectIdAndDeletedAtIsNull(String projectId);

    /** Workspace-scoped fallback (RB-40 §1): only decisions in workspaces the caller belongs to. */
    @Query(nativeQuery = true,
           value = "SELECT * FROM decision WHERE deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<Decision> findAllScopedToUser(@Param("userId") String userId);

    @Query(nativeQuery = true,
           value = "SELECT * FROM decision WHERE project_id = :projectId AND deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<Decision> findByProjectIdScopedToUser(@Param("projectId") String projectId,
                                                @Param("userId") String userId);
}
