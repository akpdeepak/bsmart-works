package com.bcits.works.messaging.api;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ActionItemRepository extends JpaRepository<ActionItem, String> {
    List<ActionItem> findByProjectIdAndDeletedAtIsNull(String projectId);
    List<ActionItem> findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(String projectId, String workspaceId);
    List<ActionItem> findBySourceMeetingIdAndDeletedAtIsNull(String sourceMeetingId);
    List<ActionItem> findByOwnerIdAndDeletedAtIsNull(String ownerId);

    /** Workspace-scoped fallback (RB-40 §1): only items whose workspace the caller belongs to. */
    @Query(nativeQuery = true,
           value = "SELECT * FROM action_item WHERE deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<ActionItem> findAllScopedToUser(@Param("userId") String userId);

    @Query(nativeQuery = true,
           value = "SELECT * FROM action_item WHERE source_meeting_id = :meetingId AND deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<ActionItem> findBySourceMeetingIdScopedToUser(@Param("meetingId") String meetingId,
                                                        @Param("userId") String userId);

    @Query(nativeQuery = true,
           value = "SELECT * FROM action_item WHERE owner_id = :ownerId AND deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<ActionItem> findByOwnerIdScopedToUser(@Param("ownerId") String ownerId,
                                                @Param("userId") String userId);

    @Query(nativeQuery = true,
           value = "SELECT * FROM action_item WHERE project_id = :projectId AND deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<ActionItem> findByProjectIdScopedToUser(@Param("projectId") String projectId,
                                                  @Param("userId") String userId);
}
