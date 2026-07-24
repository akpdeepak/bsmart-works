package com.bcits.works.knowledge;
import com.bcits.works.workspaces.api.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Workspace-scoped finders for {@link ArticleAuthor} (RB-40 §1) — the collaboration roster is always
 * read within a single workspace.
 */
public interface ArticleAuthorRepository extends JpaRepository<ArticleAuthor, String> {
    List<ArticleAuthor> findByWorkspaceIdAndArticleIdOrderByAddedAtAsc(String workspaceId, String articleId);
    Optional<ArticleAuthor> findByArticleIdAndUserId(String articleId, String userId);
}
