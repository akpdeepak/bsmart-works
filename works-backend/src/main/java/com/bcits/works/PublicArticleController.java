package com.bcits.works;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public, unauthenticated read-only access to a published article via its share token.
 */
@RestController
@RequestMapping("/api/v1/public/articles")
public class PublicArticleController {

    private final ArticleRepository articleRepository;

    public PublicArticleController(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    @GetMapping("/{token}")
    public Map<String, Object> getPublicArticle(@PathVariable String token) {
        return publicDto(loadPublished(token));
    }

    @GetMapping("/{token}/metadata")
    public Map<String, Object> getPublicMetadata(@PathVariable String token) {
        Article article = loadPublished(token);
        return Map.of(
            "id", article.getId(),
            "title", article.getTitle() != null ? article.getTitle() : "",
            "contentFormat", article.getContentFormat() != null ? article.getContentFormat() : "markdown",
            "status", article.getStatus(),
            "templateType", article.getTemplateType() != null ? article.getTemplateType() : "KB"
        );
    }

    @GetMapping("/{token}/blocks")
    public Map<String, Object> getPublicBlocks(@PathVariable String token) {
        Article article = loadPublished(token);
        return Map.of(
            "id", article.getId(),
            "title", article.getTitle() != null ? article.getTitle() : "",
            "contentBlocks", article.getContentBlocks() != null ? article.getContentBlocks() : "[]",
            "contentFormat", article.getContentFormat() != null ? article.getContentFormat() : "markdown"
        );
    }

    private Article loadPublished(String token) {
        Article article = articleRepository.findByPublicShareToken(token)
                .orElseThrow(() -> ApiException.notFound("Article", token));
        if (!"PUBLISHED".equals(article.getStatus())) {
            throw ApiException.notFound("Article", token);
        }
        return article;
    }

    private Map<String, Object> publicDto(Article article) {
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
