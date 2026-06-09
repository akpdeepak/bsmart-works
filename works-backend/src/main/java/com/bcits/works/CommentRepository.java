package com.bcits.works;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByWorkItemIdOrderByCreatedAtAsc(String workItemId);
    Page<Comment> findByWorkItemIdOrderByCreatedAtAsc(String workItemId, Pageable pageable);

    // RB-40 §1: scoped through work_items → projects → workspace_members so results
    // are always limited to workspaces the caller is a member of.
    @Query(value = "SELECT c.* FROM comments c " +
                   "JOIN work_items wi ON wi.id = c.work_item_id " +
                   "JOIN projects p ON p.id = wi.project_id " +
                   "JOIN workspace_members wm ON wm.workspace_id = p.workspace_id " +
                   "WHERE c.work_item_id = :workItemId AND wm.user_id = :callerId " +
                   "ORDER BY c.created_at ASC",
           countQuery = "SELECT COUNT(c.id) FROM comments c " +
                        "JOIN work_items wi ON wi.id = c.work_item_id " +
                        "JOIN projects p ON p.id = wi.project_id " +
                        "JOIN workspace_members wm ON wm.workspace_id = p.workspace_id " +
                        "WHERE c.work_item_id = :workItemId AND wm.user_id = :callerId",
           nativeQuery = true)
    Page<Comment> findByWorkItemIdScoped(@Param("workItemId") String workItemId,
                                         @Param("callerId") String callerId,
                                         Pageable pageable);
}
