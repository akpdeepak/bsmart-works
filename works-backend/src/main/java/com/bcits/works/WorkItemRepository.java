package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface WorkItemRepository extends JpaRepository<WorkItem, String> {
    List<WorkItem> findByAssigneeId(String assigneeId);
    List<WorkItem> findByProjectId(String projectId);

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
