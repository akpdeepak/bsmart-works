package com.bcits.works.knowledge;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/** KR-035 — repository for user article favorites. */
public interface ArticleFavoriteRepository extends JpaRepository<ArticleFavorite, ArticleFavoritePK> {
    List<ArticleFavorite> findByIdUserIdAndWorkspaceId(String userId, String workspaceId);
    boolean existsByIdUserIdAndIdArticleId(String userId, String articleId);
}
