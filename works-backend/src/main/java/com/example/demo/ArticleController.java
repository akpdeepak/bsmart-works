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
    private final ArticleCommentRepository articleCommentRepository;
    private final ArticleWorkflowService workflowService;
    private final ArticleAnalyticsService analyticsService;
    private final ArticleDiffService diffService;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final JdbcTemplate jdbc;

    public ArticleController(ArticleRepository articleRepository,
                              ArticleVersionRepository articleVersionRepository,
                              ArticleCommentRepository articleCommentRepository,
                              ArticleWorkflowService workflowService,
                              ArticleAnalyticsService analyticsService,
                              ArticleDiffService diffService,
                              EventService eventService, AuthenticatedUser authenticatedUser,
                              JdbcTemplate jdbc) {
        this.articleRepository = articleRepository;
        this.articleVersionRepository = articleVersionRepository;
        this.articleCommentRepository = articleCommentRepository;
        this.workflowService = workflowService;
        this.analyticsService = analyticsService;
        this.diffService = diffService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Article> getArticles(@RequestParam(required = false) String spaceId,
                                      @RequestParam(required = false) String query,
                                      @RequestParam(required = false) String search) {
        String q = query != null ? query : search;
        if (q != null && !q.isBlank()) {
            recordSearchTerm(q);
            return articleRepository.findByTitleContainingIgnoreCaseOrderByUpdatedAtDesc(q);
        }
        return spaceId != null
            ? articleRepository.findBySpaceIdOrderByUpdatedAtDesc(spaceId)
            : articleRepository.findAll();
    }

    // Top search terms typed into the KB — completes iteration-5 article analytics
    // (per-article views/votes/citations/stale live on /{id}/analytics; this is workspace-wide).
    @GetMapping("/analytics/search-terms")
    public List<Map<String, Object>> topSearchTerms(@RequestParam(defaultValue = "20") int limit) {
        return jdbc.queryForList(
            "SELECT term, search_count, last_searched_at FROM article_search_terms " +
            "ORDER BY search_count DESC, last_searched_at DESC LIMIT ?", Math.min(limit, 100));
    }

    private void recordSearchTerm(String raw) {
        String term = analyticsService.normalizeSearchTerm(raw);
        if (term == null) return;
        jdbc.update(
            "INSERT INTO article_search_terms (term, search_count, last_searched_at) VALUES (?, 1, NOW()) " +
            "ON CONFLICT (term) DO UPDATE SET search_count = article_search_terms.search_count + 1, last_searched_at = NOW()",
            term);
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

    // Line-level diff between two stored versions, for the version "diff view".
    @GetMapping("/{id}/versions/{from}/diff/{to}")
    public Map<String, Object> diffVersions(@PathVariable String id,
                                            @PathVariable Integer from, @PathVariable Integer to) {
        ArticleVersion vFrom = articleVersionRepository.findByArticleIdAndVersionNumber(id, from).orElseThrow();
        ArticleVersion vTo = articleVersionRepository.findByArticleIdAndVersionNumber(id, to).orElseThrow();
        return Map.of(
            "articleId", id,
            "fromVersion", from,
            "toVersion", to,
            "fromTitle", vFrom.getTitle(),
            "toTitle", vTo.getTitle(),
            "titleChanged", !java.util.Objects.equals(vFrom.getTitle(), vTo.getTitle()),
            "lines", diffService.diff(vFrom.getContent(), vTo.getContent())
        );
    }

    // Restore a prior version: copies its title/content onto the article as a new
    // version (history is preserved — the restore is itself the latest version).
    @PostMapping("/{id}/versions/{versionNumber}/restore")
    public Article restoreVersion(@PathVariable String id, @PathVariable Integer versionNumber) {
        String userId = authenticatedUser.id();
        Article a = articleRepository.findById(id).orElseThrow();
        ArticleVersion v = articleVersionRepository.findByArticleIdAndVersionNumber(id, versionNumber).orElseThrow();
        a.setTitle(v.getTitle());
        a.setContent(v.getContent());
        a.setVersionNumber(a.getVersionNumber() + 1);
        a.setUpdatedAt(OffsetDateTime.now());
        Article saved = articleRepository.save(a);
        saveVersion(saved, userId);
        eventService.record(id, "ARTICLE_VERSION_RESTORED", userId,
                "{\"restoredFrom\":" + versionNumber + ",\"newVersion\":" + saved.getVersionNumber() + "}");
        return saved;
    }

    @GetMapping("/{id}/links")
    public List<Map<String, Object>> getArticleLinks(@PathVariable String id) {
        return jdbc.queryForList(
            "SELECT l.work_item_id, l.link_type, w.title as work_item_title, w.type as work_item_type, w.status " +
            "FROM article_work_item_links l " +
            "LEFT JOIN work_items w ON w.id = l.work_item_id " +
            "WHERE l.article_id = ? ORDER BY l.created_at DESC", id);
    }

    @GetMapping("/{id}/analytics")
    public Map<String, Object> getAnalytics(@PathVariable String id) {
        Article a = articleRepository.findById(id).orElseThrow();
        long citations = countCitations(id);
        long openComments = articleCommentRepository.countByArticleIdAndResolvedFalse(id);
        long versions = articleVersionRepository.findByArticleIdOrderByVersionNumberDesc(id).size();
        OffsetDateTime now = OffsetDateTime.now();
        return Map.of(
            "viewCount", a.getViewCount() == null ? 0 : a.getViewCount(),
            "helpfulVotes", a.getHelpfulVotes() == null ? 0 : a.getHelpfulVotes(),
            "citationCount", citations,
            "openComments", openComments,
            "versionCount", versions,
            "status", a.getStatus() == null ? "DRAFT" : a.getStatus(),
            "daysSinceUpdate", analyticsService.daysSince(a.getUpdatedAt(), now),
            "stale", analyticsService.isStale(a.getStatus(), a.getUpdatedAt(), now,
                                              ArticleAnalyticsService.STALE_THRESHOLD_DAYS)
        );
    }

    private long countCitations(String articleId) {
        Long n = jdbc.queryForObject(
            "SELECT COUNT(*) FROM article_work_item_links WHERE article_id = ?", Long.class, articleId);
        return n == null ? 0 : n;
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

    // Content edits only — status changes go through the workflow endpoints so the
    // Author -> Review -> Publish gate cannot be bypassed (CLAUDE.md §5 iteration 5).
    @PutMapping("/{id}")
    public Article updateArticle(@PathVariable String id, @Valid @RequestBody Article updated) {
        String userId = authenticatedUser.id();
        return articleRepository.findById(id).map(a -> {
            a.setTitle(updated.getTitle());
            a.setContent(updated.getContent());
            a.setTemplateType(updated.getTemplateType());
            a.setVersionNumber(a.getVersionNumber() + 1);
            a.setUpdatedAt(OffsetDateTime.now());
            Article saved = articleRepository.save(a);
            saveVersion(saved, userId);
            eventService.record(id, "ARTICLE_UPDATED", userId, "{\"version\":" + saved.getVersionNumber() + "}");
            return saved;
        }).orElseThrow();
    }

    // ── Publishing workflow ───────────────────────────────────────────────────
    @PutMapping("/{id}/submit")
    public Article submitForReview(@PathVariable String id) { return applyTransition(id, "submit"); }

    @PutMapping("/{id}/publish")
    public Article publish(@PathVariable String id) { return applyTransition(id, "publish"); }

    @PutMapping("/{id}/reject")
    public Article reject(@PathVariable String id) { return applyTransition(id, "reject"); }

    @PutMapping("/{id}/archive")
    public Article archive(@PathVariable String id) { return applyTransition(id, "archive"); }

    @PutMapping("/{id}/restore")
    public Article restore(@PathVariable String id) { return applyTransition(id, "restore"); }

    private Article applyTransition(String id, String action) {
        String userId = authenticatedUser.id();
        Article a = articleRepository.findById(id).orElseThrow();
        String newStatus = workflowService.transition(a.getStatus(), action);
        OffsetDateTime now = OffsetDateTime.now();
        a.setStatus(newStatus);
        if (ArticleWorkflowService.IN_REVIEW.equals(newStatus)) {
            a.setSubmittedAt(now);
        } else if (ArticleWorkflowService.PUBLISHED.equals(newStatus)) {
            a.setPublishedAt(now);
            a.setReviewerId(userId);
        }
        a.setUpdatedAt(now);
        Article saved = articleRepository.save(a);
        eventService.record(id, "ARTICLE_" + action.toUpperCase(), userId,
                "{\"status\":\"" + newStatus + "\"}");
        return saved;
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
