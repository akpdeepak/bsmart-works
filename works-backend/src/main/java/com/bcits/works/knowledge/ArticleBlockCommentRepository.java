package com.bcits.works.knowledge;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ArticleBlockCommentRepository extends JpaRepository<ArticleBlockComment, String> {

    /** All comments for an article, ordered oldest-first (for thread display). */
    @Query("SELECT c FROM ArticleBlockComment c WHERE c.articleId = :articleId AND c.workspaceId = :workspaceId ORDER BY c.createdAt ASC")
    List<ArticleBlockComment> findByArticleIdAndWorkspaceId(@Param("articleId") String articleId,
                                                             @Param("workspaceId") String workspaceId);

    /** Comments for a specific block (workspace-scoped). */
    @Query("SELECT c FROM ArticleBlockComment c WHERE c.articleId = :articleId AND c.blockId = :blockId AND c.workspaceId = :workspaceId ORDER BY c.createdAt ASC")
    List<ArticleBlockComment> findByArticleIdAndBlockIdAndWorkspaceId(@Param("articleId") String articleId,
                                                                       @Param("blockId") String blockId,
                                                                       @Param("workspaceId") String workspaceId);

    /** Count unresolved root comments for a block (used for bubble badge). */
    @Query("SELECT COUNT(c) FROM ArticleBlockComment c WHERE c.articleId = :articleId AND c.blockId = :blockId AND c.workspaceId = :workspaceId AND c.resolved = false AND c.parentId IS NULL")
    long countUnresolvedRootByArticleAndBlock(@Param("articleId") String articleId,
                                               @Param("blockId") String blockId,
                                               @Param("workspaceId") String workspaceId);

    /** All root comments for a block (no parent). */
    List<ArticleBlockComment> findByArticleIdAndBlockIdAndParentIdIsNullOrderByCreatedAtAsc(
            String articleId, String blockId);

    /** Replies to a root comment. */
    List<ArticleBlockComment> findByParentIdOrderByCreatedAtAsc(String parentId);

    /** Find a comment by id and workspace (tenant-scoped lookup). */
    Optional<ArticleBlockComment> findByIdAndWorkspaceId(String id, String workspaceId);
}
