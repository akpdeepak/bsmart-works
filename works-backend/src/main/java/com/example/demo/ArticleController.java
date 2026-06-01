package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/articles")
public class ArticleController {

    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository articleVersionRepository;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final JdbcTemplate jdbc;

    public ArticleController(ArticleRepository articleRepository,
                              ArticleVersionRepository articleVersionRepository,
                              EventService eventService, AuthenticatedUser authenticatedUser,
                              JdbcTemplate jdbc) {
        this.articleRepository = articleRepository;
        this.articleVersionRepository = articleVersionRepository;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Article> getArticles(@RequestParam(required = false) String spaceId,
                                      @RequestParam(required = false) String query) {
        if (query != null && !query.isBlank()) {
            return articleRepository.findByTitleContainingIgnoreCaseOrderByUpdatedAtDesc(query);
        }
        return spaceId != null
            ? articleRepository.findBySpaceIdOrderByUpdatedAtDesc(spaceId)
            : articleRepository.findAll();
    }

    @GetMapping("/{id}")
    public Article getArticle(@PathVariable String id) {
        Article article = articleRepository.findById(id).orElseThrow();
        // increment view count
        jdbc.update("UPDATE articles SET view_count = view_count + 1 WHERE id = ?", id);
        article.setViewCount(article.getViewCount() + 1);
        return article;
    }

    @GetMapping("/{id}/versions")
    public List<ArticleVersion> getVersions(@PathVariable String id) {
        return articleVersionRepository.findByArticleIdOrderByVersionNumberDesc(id);
    }

    @GetMapping("/{id}/links")
    public List<Map<String, Object>> getArticleLinks(@PathVariable String id) {
        return jdbc.queryForList(
            "SELECT l.work_item_id, l.link_type, w.title as work_item_title, w.type as work_item_type, w.status " +
            "FROM article_work_item_links l " +
            "LEFT JOIN work_items w ON w.id = l.work_item_id " +
            "WHERE l.article_id = ? ORDER BY l.created_at DESC", id);
    }

    @PostMapping
    public Article createArticle(@Valid @RequestBody Article article) {
        String userId = authenticatedUser.id();
        article.setId("ART-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        article.setStatus(article.getStatus() != null ? article.getStatus() : "DRAFT");
        article.setVersionNumber(1);
        article.setHelpfulVotes(0);
        article.setViewCount(0);
        article.setAuthorId(userId);
        article.setCreatedBy(userId);
        article.setCreatedAt(OffsetDateTime.now());
        article.setUpdatedAt(OffsetDateTime.now());
        Article saved = articleRepository.save(article);
        // Snapshot version 1
        saveVersion(saved, userId);
        eventService.record(saved.getId(), "ARTICLE_CREATED", userId, "{\"title\":\"" + saved.getTitle() + "\"}");
        return saved;
    }

    @PutMapping("/{id}")
    public Article updateArticle(@PathVariable String id, @Valid @RequestBody Article updated) {
        String userId = authenticatedUser.id();
        return articleRepository.findById(id).map(a -> {
            a.setTitle(updated.getTitle());
            a.setContent(updated.getContent());
            a.setTemplateType(updated.getTemplateType());
            String oldStatus = a.getStatus();
            a.setStatus(updated.getStatus());
            if ("PUBLISHED".equals(updated.getStatus()) && !"PUBLISHED".equals(oldStatus)) {
                a.setPublishedAt(OffsetDateTime.now());
            }
            a.setVersionNumber(a.getVersionNumber() + 1);
            a.setUpdatedAt(OffsetDateTime.now());
            Article saved = articleRepository.save(a);
            saveVersion(saved, userId);
            eventService.record(id, "ARTICLE_UPDATED", userId, "{\"version\":" + saved.getVersionNumber() + "}");
            return saved;
        }).orElseThrow();
    }

    @PostMapping("/{id}/vote")
    public Article voteHelpful(@PathVariable String id) {
        jdbc.update("UPDATE articles SET helpful_votes = helpful_votes + 1 WHERE id = ?", id);
        return articleRepository.findById(id).orElseThrow();
    }

    @PostMapping("/{id}/links")
    public Map<String, String> linkWorkItem(@PathVariable String id,
                                             @Valid @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        String workItemId = body.get("workItemId");
        String linkType = body.getOrDefault("linkType", "RELATED");
        jdbc.update("INSERT INTO article_work_item_links (article_id, work_item_id, link_type, created_by, created_at) " +
                    "VALUES (?, ?, ?, ?, NOW()) ON CONFLICT (article_id, work_item_id) DO NOTHING",
                    id, workItemId, linkType, userId);
        return Map.of("message", "Link created");
    }

    @DeleteMapping("/{id}/links/{workItemId}")
    public ResponseEntity<Void> unlinkWorkItem(@PathVariable String id, @PathVariable String workItemId) {
        jdbc.update("DELETE FROM article_work_item_links WHERE article_id = ? AND work_item_id = ?", id, workItemId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable String id) {
        articleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void saveVersion(Article article, String userId) {
        ArticleVersion v = new ArticleVersion();
        v.setArticleId(article.getId());
        v.setVersionNumber(article.getVersionNumber());
        v.setTitle(article.getTitle());
        v.setContent(article.getContent());
        v.setSavedBy(userId);
        v.setSavedAt(OffsetDateTime.now());
        articleVersionRepository.save(v);
    }
}
