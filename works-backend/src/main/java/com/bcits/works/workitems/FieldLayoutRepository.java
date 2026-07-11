package com.bcits.works.workitems;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface FieldLayoutRepository extends JpaRepository<FieldLayout, String> {
    Optional<FieldLayout> findByWorkspaceIdAndItemType(String workspaceId, String itemType);
    Optional<FieldLayout> findByProjectIdAndItemType(String projectId, String itemType);
    List<FieldLayout> findByWorkspaceId(String workspaceId);

    /** Workspace-scoped fallback (RB-40 §1): layouts visible only in the caller's workspaces. */
    @Query(nativeQuery = true,
           value = "SELECT * FROM field_layout " +
                   "WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<FieldLayout> findAllScopedToUser(@Param("userId") String userId);
}
