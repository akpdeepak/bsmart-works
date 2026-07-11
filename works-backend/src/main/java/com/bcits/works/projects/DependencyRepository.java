package com.bcits.works.projects;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DependencyRepository extends JpaRepository<Dependency, String> {
    List<Dependency> findByProjectIdAndDeletedAtIsNull(String projectId);

    /** Bounded to a project within its owning workspace (RB-40 §1) — a foreign projectId cannot leak rows. */
    List<Dependency> findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(String projectId, String workspaceId);

    /** Workspace-scoped fallback (RB-40 §1): only dependencies in workspaces the caller belongs to. */
    @Query(nativeQuery = true,
           value = "SELECT * FROM dependency WHERE deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<Dependency> findAllScopedToUser(@Param("userId") String userId);

    @Query(nativeQuery = true,
           value = "SELECT * FROM dependency WHERE project_id = :projectId AND deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<Dependency> findByProjectIdScopedToUser(@Param("projectId") String projectId,
                                                  @Param("userId") String userId);
}
