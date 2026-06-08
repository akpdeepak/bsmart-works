package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface LessonLearnedRepository extends JpaRepository<LessonLearned, String> {
    List<LessonLearned> findByProjectIdAndDeletedAtIsNull(String projectId);
    List<LessonLearned> findByWorkspaceIdAndDeletedAtIsNull(String workspaceId);

    /** Workspace-scoped fallback (RB-40 §1): only lessons in workspaces the caller belongs to. */
    @Query(nativeQuery = true,
           value = "SELECT * FROM lesson_learned WHERE deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<LessonLearned> findAllScopedToUser(@Param("userId") String userId);

    @Query(nativeQuery = true,
           value = "SELECT * FROM lesson_learned WHERE project_id = :projectId AND deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<LessonLearned> findByProjectIdScopedToUser(@Param("projectId") String projectId,
                                                     @Param("userId") String userId);

    @Query(nativeQuery = true,
           value = "SELECT * FROM lesson_learned WHERE workspace_id = :workspaceId AND deleted_at IS NULL " +
                   "AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    List<LessonLearned> findByWorkspaceIdScopedToUser(@Param("workspaceId") String workspaceId,
                                                       @Param("userId") String userId);
}
