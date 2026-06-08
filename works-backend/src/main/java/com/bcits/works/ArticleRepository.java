package com.bcits.works;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

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
