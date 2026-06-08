package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CrossProjectDependencyRepository extends JpaRepository<CrossProjectDependency, String> {
    List<CrossProjectDependency> findByFromProjectIdOrderByCreatedAtDesc(String fromProjectId);

    /** Returns dependencies where either endpoint project belongs to the given workspace (RB-40 §1). */
    @Query(value = "SELECT DISTINCT d.* FROM cross_project_dependencies d " +
                   "JOIN projects p ON p.id = d.from_project_id OR p.id = d.to_project_id " +
                   "WHERE p.workspace_id = :workspaceId " +
                   "ORDER BY d.created_at DESC",
           nativeQuery = true)
    List<CrossProjectDependency> findByWorkspaceId(@Param("workspaceId") String workspaceId);
}
