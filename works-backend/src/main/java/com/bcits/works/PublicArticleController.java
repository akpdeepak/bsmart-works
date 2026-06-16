package com.bcits.works;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * KR-066: Public, unauthenticated read-only access to a PUBLISHED article via its share token.
 *
 * <p>The token is an unguessable, revocable 64-char secret minted by the article author. This
 * endpoint deliberately omits workspace-sensitive data: only title, content, contentBlocks,
 * contentFormat, status, and templateType are returned — no authorId, workspaceId, spaceId,
 * reviewerId, or internal timestamps.</p>
 *
 * <p>Security: permitted under GET {@code /api/v1/public/**} by
 * {@link SecurityConfig#publicEmbedFilterChain} (Order 1) without JWT validation. The endpoint
 * itself enforces that the article must be PUBLISHED — a token on a non-PUBLISHED article returns
 * 404, preventing information leakage about draft content.</p>
 *
 * <p>No workspace scoping here by design: the token IS the access credential. The article must
 * be PUBLISHED — the public view never reveals DRAFT / IN_REVIEW / ARCHIVED content.</p>
 */
@RestController
@RequestMapping("/api/v1/public/articles")
public class PublicArticleController {

    private final ArticleRepository articleRepository;

    public PublicArticleController(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    /**
     * Fetch a published article by its public share token.
     * Returns a minimal, safe-for-public DTO — no workspace-sensitive fields.
     * Returns 404 if the token is not found or the article is not PUBLISHED.
     */
    @GetMapping("/{token}")
    public Map<String, Object> getPublicArticle(@PathVariable String token) {
        Article article = articleRepository.findByPublicShareToken(token)
                .orElseThrow(() -> ApiException.notFound("Article", token));

        // Enforce PUBLISHED status — a revoked or draft article token returns 404.
        if (!"PUBLISHED".equals(article.getStatus())) {
            throw ApiException.notFound("Article", token);
        }

        // Return only public-safe fields — never workspace IDs, author identity, or internal state.
        return Map.of(
            "id", article.getId(),
            "title", article.getTitle() != null ? article.getTitle() : "",
            "content", article.getContent() != null ? article.getContent() : "",
            "contentBlocks", article.getContentBlocks() != null ? article.getContentBlocks() : "[]",
            "contentFormat", article.getContentFormat() != null ? article.getContentFormat() : "markdown",
            "status", article.getStatus(),
            "templateType", article.getTemplateType() != null ? article.getTemplateType() : "KB"
        );
    }
}
