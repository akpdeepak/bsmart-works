package com.bcits.works.knowledge.api;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface ArticleRepository extends JpaRepository<Article, String> {
    List<Article> findBySpaceIdOrderByUpdatedAtDesc(String spaceId);
    Page<Article> findBySpaceIdOrderByUpdatedAtDesc(String spaceId, Pageable pageable);
    List<Article> findBySpaceIdAndStatusOrderByUpdatedAtDesc(String spaceId, String status);
    Page<Article> findBySpaceIdAndStatusOrderByUpdatedAtDesc(String spaceId, String status, Pageable pageable);
    List<Article> findByTitleContainingIgnoreCaseOrderByUpdatedAtDesc(String query);

    /** Workspace-scoped full list (RB-40 §1): articles whose space belongs to the caller's workspaces. */
    @Query(nativeQuery = true,
           value = "SELECT a.* FROM articles a " +
                   "JOIN knowledge_spaces ks ON ks.id = a.space_id " +
                   "WHERE ks.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId) " +
                   "ORDER BY a.updated_at DESC",
           countQuery = "SELECT COUNT(*) FROM articles a " +
                        "JOIN knowledge_spaces ks ON ks.id = a.space_id " +
                        "WHERE ks.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    Page<Article> findAllScopedToUser(@Param("userId") String userId, Pageable pageable);

    /** Workspace-scoped per-space list (RB-40 §1). */
    @Query(nativeQuery = true,
           value = "SELECT a.* FROM articles a " +
                   "JOIN knowledge_spaces ks ON ks.id = a.space_id " +
                   "WHERE a.space_id = :spaceId " +
                   "AND ks.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId) " +
                   "ORDER BY a.updated_at DESC",
           countQuery = "SELECT COUNT(*) FROM articles a " +
                        "JOIN knowledge_spaces ks ON ks.id = a.space_id " +
                        "WHERE a.space_id = :spaceId " +
                        "AND ks.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    Page<Article> findBySpaceIdScopedToUser(@Param("spaceId") String spaceId,
                                             @Param("userId") String userId,
                                             Pageable pageable);

    /** Children of a given parent article (workspace-scoped via parent's space). */
    List<Article> findByParentIdOrderByUpdatedAtDesc(String parentId);

    /** Top-level articles in a space (no parent). */
    List<Article> findBySpaceIdAndParentIdIsNullOrderByUpdatedAtDesc(String spaceId);

    // KR-066: look up a published article by its public share token (no workspace scope —
    // this is the ONE intended public-facing lookup; the controller verifies PUBLISHED status).
    Optional<Article> findByPublicShareToken(String publicShareToken);

    // KR-020: scheduled publish — find SCHEDULED articles whose publish time has elapsed.
    List<Article> findByStatusAndScheduledPublishAtBefore(String status, OffsetDateTime before);

    // KR-021: stale check — PUBLISHED articles with a passed review_by_date, not yet flagged.
    // Joins knowledge_spaces to ensure workspace_id exists on every row (RB-40 §1).
    // System job: intentionally crosses workspaces so staleness can be flagged tenant-wide.
    @Query(nativeQuery = true,
           value = "SELECT a.* FROM articles a " +
                   "JOIN knowledge_spaces ks ON ks.id = a.space_id " +
                   "WHERE a.status = 'PUBLISHED' " +
                   "AND a.review_by_date IS NOT NULL AND a.review_by_date < CURRENT_DATE " +
                   "AND (a.is_stale IS NULL OR a.is_stale = false) " +
                   "AND ks.workspace_id IS NOT NULL")
    List<Article> findPublishedWithPassedReviewByDate();

    /** Workspace-scoped search (RB-40 §1). */
    @Query(nativeQuery = true,
           value = "SELECT a.* FROM articles a " +
                   "JOIN knowledge_spaces ks ON ks.id = a.space_id " +
                   "WHERE LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
                   "AND ks.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId) " +
                   "ORDER BY a.updated_at DESC",
           countQuery = "SELECT COUNT(*) FROM articles a " +
                        "JOIN knowledge_spaces ks ON ks.id = a.space_id " +
                        "WHERE LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
                        "AND ks.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = :userId)")
    Page<Article> findByTitleScopedToUser(@Param("query") String query,
                                           @Param("userId") String userId,
                                           Pageable pageable);
}
