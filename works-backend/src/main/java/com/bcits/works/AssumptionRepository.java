package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface AssumptionRepository extends JpaRepository<Assumption, String> {
    List<Assumption> findByProjectIdAndDeletedAtIsNull(String projectId);

    /** Bounded to a project within its owning workspace (RB-40 §1) — a foreign projectId cannot leak rows. */
    List<Assumption> findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(String projectId, String workspaceId);

    /** Workspace-scoped fallback (RB-40 §1): only assumptions in workspaces the caller belongs to. */
    @Query(nativeQuery = true,
           value = "SELECT * FROM assumption WHERE deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<Assumption> findAllScopedToUser(@Param("userId") String userId);

    @Query(nativeQuery = true,
           value = "SELECT * FROM assumption WHERE project_id = :projectId AND deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<Assumption> findByProjectIdScopedToUser(@Param("projectId") String projectId,
                                                  @Param("userId") String userId);
}
