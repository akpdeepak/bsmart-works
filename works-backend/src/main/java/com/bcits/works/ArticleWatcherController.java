package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Article watch / subscribe endpoints (KR-067).
 *
 * <p>POST /api/v1/articles/{id}/watch  — toggle watch (upsert if not watching, delete if watching)
 * <p>GET  /api/v1/articles/{id}/watch  — returns { watching: bool, watcherCount: int }
 *
 * <p>RBAC: view_items is sufficient for watching (you must be able to see an article to watch it).
 * Workspace-scoping: the article's space is resolved and RBAC is checked before any mutation.
 */
@RestController
@RequestMapping("/api/v1/articles")
public class ArticleWatcherController {

    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final ArticleWatcherService watcherService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ArticleWatcherController(ArticleRepository articleRepository,
                                     KnowledgeSpaceRepository knowledgeSpaceRepository,
                                     ArticleWatcherService watcherService,
                                     AuthenticatedUser authenticatedUser,
                                     RbacService rbac) {
        this.articleRepository = articleRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.watcherService = watcherService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** Toggle watch on/off. Returns { watching, watcherCount }. */
    @PostMapping("/{id}/watch")
    public Map<String, Object> toggleWatch(@PathVariable String id) {
        String userId = authenticatedUser.id();
        String workspaceId = requireArticleAccess(id, userId);
        return watcherService.toggle(userId, id, workspaceId);
    }

    /** Returns { watching, watcherCount } for the current user. */
    @GetMapping("/{id}/watch")
    public Map<String, Object> getWatchStatus(@PathVariable String id) {
        String userId = authenticatedUser.id();
        requireArticleAccess(id, userId);
        return watcherService.getStatus(userId, id);
    }

    // ── private helpers ───────────────────────────────────────────────────────

    /**
     * Verifies the article exists and the caller belongs to its workspace.
     * Returns the workspaceId for use in subsequent service calls.
     */
    private String requireArticleAccess(String articleId, String userId) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        rbac.require(userId, space.getWorkspaceId(), "view_items");
        return space.getWorkspaceId();
    }
}
