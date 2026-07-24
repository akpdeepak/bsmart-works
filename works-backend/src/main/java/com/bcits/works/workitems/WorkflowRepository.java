package com.bcits.works.workitems;
import com.bcits.works.workspaces.api.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface WorkflowRepository extends JpaRepository<Workflow, String> {
    List<Workflow> findByWorkspaceId(String workspaceId);
    List<Workflow> findByProjectId(String projectId);
    List<Workflow> findByWorkspaceIdAndProjectId(String workspaceId, String projectId);
    List<Workflow> findByWorkspaceIdAndItemType(String workspaceId, String itemType);

    /** Workspace-scoped fallback (RB-40 §1): workflows visible only in the caller's workspaces. */
    @Query(nativeQuery = true,
           value = "SELECT * FROM workflow " +
                   "WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<Workflow> findAllScopedToUser(@Param("userId") String userId);
}
