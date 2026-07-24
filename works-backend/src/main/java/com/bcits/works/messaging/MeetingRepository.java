package com.bcits.works.messaging;
import com.bcits.works.workspaces.api.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface MeetingRepository extends JpaRepository<Meeting, String> {
    List<Meeting> findByProjectIdAndDeletedAtIsNullOrderByScheduledAtDesc(String projectId);

    /** Workspace-scoped fallback (RB-40 §1): only meetings in workspaces the caller belongs to. */
    @Query(nativeQuery = true,
           value = "SELECT * FROM meeting WHERE deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId) " +
                   "ORDER BY scheduled_at DESC")
    List<Meeting> findAllScopedToUser(@Param("userId") String userId);

    @Query(nativeQuery = true,
           value = "SELECT * FROM meeting WHERE project_id = :projectId AND deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId) " +
                   "ORDER BY scheduled_at DESC")
    List<Meeting> findByProjectIdScopedToUser(@Param("projectId") String projectId,
                                               @Param("userId") String userId);
}
