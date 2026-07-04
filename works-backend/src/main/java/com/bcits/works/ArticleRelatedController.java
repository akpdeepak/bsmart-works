package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * KR-045 — related articles via shared tag overlap.
 *
 * GET /api/v1/articles/{articleId}/related?workspaceId=
 *
 * Returns up to 5 articles in the same workspace that share at least one tag with the
 * given article, ordered by descending tag-overlap count (most-related first).
 * Workspace-scoped (RB-40 §1): restricted to caller's workspace via knowledge_spaces JOIN.
 * RBAC (RB-10 §2): view_items.
 */
@RestController
@RequestMapping("/api/v1/articles")
public class ArticleRelatedController {

    private final JdbcTemplate jdbc;
    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository spaceRepository;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public ArticleRelatedController(JdbcTemplate jdbc,
                                     ArticleRepository articleRepository,
                                     KnowledgeSpaceRepository spaceRepository,
                                     AuthenticatedUser authenticatedUser,
                                     RbacGate rbac) {
        this.jdbc = jdbc;
        this.articleRepository = articleRepository;
        this.spaceRepository = spaceRepository;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping("/{articleId}/related")
    public List<Map<String, Object>> relatedArticles(@PathVariable String articleId,
                                                      @RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        // Verify article exists and belongs to this workspace.
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        KnowledgeSpace space = spaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        if (!workspaceId.equals(space.getWorkspaceId())) {
            throw ApiException.notFound("Article", articleId);
        }

        // Find articles sharing at least one tag, ordered by overlap count, excluding self.
        // All scoped to the workspace via knowledge_spaces JOIN (RB-40 §1).
        return jdbc.queryForList(
            "SELECT a.id, a.title, a.status, a.icon, a.template_type, " +
            "       COUNT(shared.tag_id) AS shared_tag_count " +
            "FROM article_tag_assignments source " +
            "JOIN article_tag_assignments shared ON shared.tag_id = source.tag_id " +
            "     AND shared.article_id <> ? " +
            "JOIN articles a ON a.id = shared.article_id " +
            "JOIN knowledge_spaces ks ON ks.id = a.space_id " +
            "WHERE source.article_id = ? " +
            "  AND ks.workspace_id = ? " +
            "GROUP BY a.id, a.title, a.status, a.icon, a.template_type " +
            "ORDER BY shared_tag_count DESC, a.updated_at DESC " +
            "LIMIT 5",
            articleId, articleId, workspaceId);
    }
}
