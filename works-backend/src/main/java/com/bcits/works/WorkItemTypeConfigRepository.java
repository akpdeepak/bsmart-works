package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface WorkItemTypeConfigRepository extends JpaRepository<WorkItemTypeConfig, String> {
    List<WorkItemTypeConfig> findByWorkspaceId(String workspaceId);
    List<WorkItemTypeConfig> findByProjectId(String projectId);

    /** Workspace-scoped fallback (RB-40 §1): custom types visible only in the caller's workspaces. */
    @Query(nativeQuery = true,
           value = "SELECT * FROM work_item_type_config " +
                   "WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<WorkItemTypeConfig> findAllScopedToUser(@Param("userId") String userId);
}
