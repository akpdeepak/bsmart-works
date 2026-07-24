package com.bcits.works.workitems.api;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface WorkItemRepository extends JpaRepository<WorkItem, String> {
    List<WorkItem> findByProjectId(String projectId);

    // RB-40 §1: the signed-in user's assigned items, scoped through project → workspace_members so
    // a user only ever sees items in workspaces they currently belong to (an item assigned in a
    // workspace they have since left must not surface). Replaces the unscoped findByAssigneeId.
    @Query(value = "SELECT * FROM work_items WHERE deleted_at IS NULL AND assignee_id = :callerId " +
                   "AND project_id IN (SELECT p.id FROM projects p " +
                   "JOIN workspace_members wm ON wm.workspace_id = p.workspace_id " +
                   "WHERE wm.user_id = :callerId)",
           nativeQuery = true)
    List<WorkItem> findMyItemsScoped(@Param("callerId") String callerId);

    // RB-40 §1: scoped through project → workspace_members so results are always
    // limited to workspaces the caller is a member of.
    @Query(value = "SELECT * FROM work_items WHERE deleted_at IS NULL " +
                   "AND project_id IN (SELECT p.id FROM projects p " +
                   "JOIN workspace_members wm ON wm.workspace_id = p.workspace_id " +
                   "WHERE wm.user_id = :callerId) " +
                   "AND (LOWER(title) LIKE LOWER(CONCAT('%', :q, '%')) " +
                   "OR LOWER(COALESCE(description, '')) LIKE LOWER(CONCAT('%', :q, '%')))",
           nativeQuery = true)
    List<WorkItem> search(@Param("q") String query, @Param("callerId") String callerId);
}
