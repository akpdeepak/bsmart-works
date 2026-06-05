package com.example.demo;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

/**
 * Data access for portal KB articles. All lookups are workspace-scoped so a portal article can never
 * be read across tenants (RB-40 §1); the customer-facing search is scoped to the customer's own
 * workspace and uses a bound parameter (never string-concatenated — CLAUDE.md §17).
 */
public interface PortalKbArticleRepository extends JpaRepository<PortalKbArticle, String> {

    List<PortalKbArticle> findByWorkspaceIdOrderByPublishedAtDesc(String workspaceId);

    Optional<PortalKbArticle> findByWorkspaceIdAndArticleId(String workspaceId, String articleId);

    @Query("SELECT a FROM PortalKbArticle a WHERE a.workspaceId = :workspaceId AND ("
            + "LOWER(a.title) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(COALESCE(a.body, '')) LIKE LOWER(CONCAT('%', :q, '%'))) "
            + "ORDER BY a.publishedAt DESC")
    List<PortalKbArticle> search(@Param("workspaceId") String workspaceId,
                                 @Param("q") String query, Limit limit);
}
