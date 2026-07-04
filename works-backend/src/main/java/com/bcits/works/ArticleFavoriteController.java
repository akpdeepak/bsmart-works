package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * KR-035 — starred/favorite articles per user.
 *
 * Workspace-scoped (RB-40 §1): favorites are scoped to the workspace_id on each row.
 * RBAC (RB-10 §2): view_items required for all endpoints.
 * User identity extracted from JWT via AuthenticatedUser.
 */
@RestController
@RequestMapping("/api/v1/articles")
public class ArticleFavoriteController {

    private final ArticleFavoriteRepository favoriteRepository;
    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository spaceRepository;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public ArticleFavoriteController(ArticleFavoriteRepository favoriteRepository,
                                      ArticleRepository articleRepository,
                                      KnowledgeSpaceRepository spaceRepository,
                                      AuthenticatedUser authenticatedUser,
                                      RbacGate rbac) {
        this.favoriteRepository = favoriteRepository;
        this.articleRepository = articleRepository;
        this.spaceRepository = spaceRepository;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    /** List favorite articles for the current user in the workspace. */
    @GetMapping("/favorites")
    public List<Article> listFavorites(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        List<ArticleFavorite> favs = favoriteRepository.findByIdUserIdAndWorkspaceId(userId, workspaceId);
        return favs.stream()
                .map(f -> articleRepository.findById(f.getId().getArticleId()).orElse(null))
                .filter(a -> a != null)
                .toList();
    }

    /** Star (favorite) an article for the current user. */
    @PostMapping("/{articleId}/favorite")
    public ResponseEntity<Void> addFavorite(@PathVariable String articleId,
                                             @RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        requireArticleInWorkspace(articleId, workspaceId);
        ArticleFavoritePK pk = new ArticleFavoritePK(userId, articleId);
        if (!favoriteRepository.existsByIdUserIdAndIdArticleId(userId, articleId)) {
            ArticleFavorite fav = new ArticleFavorite();
            fav.setId(pk);
            fav.setWorkspaceId(workspaceId);
            favoriteRepository.save(fav);
        }
        return ResponseEntity.ok().build();
    }

    /** Unstar (unfavorite) an article for the current user. */
    @DeleteMapping("/{articleId}/favorite")
    public ResponseEntity<Void> removeFavorite(@PathVariable String articleId,
                                                @RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        requireArticleInWorkspace(articleId, workspaceId);
        ArticleFavoritePK pk = new ArticleFavoritePK(userId, articleId);
        favoriteRepository.deleteById(pk);
        return ResponseEntity.noContent().build();
    }

    /** Verify the article exists and its space belongs to the given workspace. */
    private void requireArticleInWorkspace(String articleId, String workspaceId) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        KnowledgeSpace space = spaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        if (!workspaceId.equals(space.getWorkspaceId())) {
            throw ApiException.notFound("Article", articleId);
        }
    }
}
