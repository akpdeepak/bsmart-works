package com.bcits.works;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

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
    private final ArticleDao articleDao;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final RbacService rbac;
    private final ArticleService articleService;

    public ArticleController(ArticleRepository articleRepository,
                              ArticleVersionRepository articleVersionRepository,
                              ArticleCommentRepository articleCommentRepository,
                              ArticleWorkflowService workflowService,
                              ArticleAnalyticsService analyticsService,
                              ArticleDiffService diffService,
                              EventService eventService, AuthenticatedUser authenticatedUser,
                              ArticleDao articleDao,
                              KnowledgeSpaceRepository knowledgeSpaceRepository,
                              RbacService rbac,
                              ArticleService articleService) {
        this.articleRepository = articleRepository;
        this.articleVersionRepository = articleVersionRepository;
        this.articleCommentRepository = articleCommentRepository;
        this.workflowService = workflowService;
        this.analyticsService = analyticsService;
        this.diffService = diffService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.articleDao = articleDao;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.rbac = rbac;
        this.articleService = articleService;
    }

    @GetMapping
    public List<Article> getArticles(@RequestParam(required = false) String spaceId,
                                      @RequestParam(required = false) String query,
                                      @RequestParam(required = false) String search,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "50") int size) {
        String userId = authenticatedUser.id();
        String q = query != null ? query : search;
        org.springframework.data.domain.Pageable pageable =
            org.springframework.data.domain.PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200));
        // Every path is workspace-scoped (RB-40 §1): articles scoped through knowledge_spaces.
        if (q != null && !q.isBlank()) {
            recordSearchTerm(q);
            return articleRepository.findByTitleScopedToUser(q, userId, pageable).getContent();
        }
        return spaceId != null
            ? articleRepository.findBySpaceIdScopedToUser(spaceId, userId, pageable).getContent()
            : articleRepository.findAllScopedToUser(userId, pageable).getContent();
    }

    // Top search terms typed into the KB — completes iteration-5 article analytics
    // (per-article views/votes/citations/stale live on /{id}/analytics; this is workspace-wide).
    @GetMapping("/analytics/search-terms")
    public List<Map<String, Object>> topSearchTerms(@RequestParam(defaultValue = "20") int limit) {
        return articleDao.topSearchTerms(limit);
    }

    private void recordSearchTerm(String raw) {
        String term = analyticsService.normalizeSearchTerm(raw);
        if (term == null) return;
        articleDao.recordSearchTerm(term);
    }

    @GetMapping("/{id}")
    public Article getArticle(@PathVariable String id) {
        Article article = articleRepository.findById(id).orElseThrow();
        requireArticleAccess(article);
        // increment view count
        articleDao.incrementViewCount(id);
        article.setViewCount(article.getViewCount() + 1);
        return article;
    }

    /** Returns direct children of an article, for hierarchical navigation. */
    @GetMapping("/{id}/children")
    public List<Article> getChildren(@PathVariable String id) {
        Article parent = articleRepository.findById(id).orElseThrow();
        requireArticleAccess(parent);
        return articleRepository.findByParentIdOrderByUpdatedAtDesc(id);
    }

    @GetMapping("/{id}/versions")
    public List<ArticleVersion> getVersions(@PathVariable String id,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "50") int size) {
        requireArticleById(id);
        int limit = Math.min(Math.max(size, 1), 200);
        return articleVersionRepository.findByArticleIdOrderByVersionNumberDesc(id,
            PageRequest.of(Math.max(page, 0), limit)).getContent();
    }

    // Line-level diff between two stored versions, for the version "diff view".
    @GetMapping("/{id}/versions/{from}/diff/{to}")
    public Map<String, Object> diffVersions(@PathVariable String id,
                                            @PathVariable Integer from, @PathVariable Integer to) {
        requireArticleById(id);
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
        Article a = requireArticleById(id);
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
        requireArticleById(id);
        return articleDao.articleLinks(id);
    }

    @GetMapping("/{id}/analytics")
    public Map<String, Object> getAnalytics(@PathVariable String id) {
        Article a = requireArticleById(id);
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
        return articleDao.countCitations(articleId);
    }

    @PostMapping
    public Article createArticle(@Valid @RequestBody Article article) {
        String userId = authenticatedUser.id();
        validateBlockEditor(article);
        // Workspace-scoped (RB-40 §1): the target space must belong to a workspace the caller is in,
        // otherwise an article could be created inside another tenant's space.
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.badRequest("SPACE_REQUIRED", "A valid spaceId is required.", "spaceId"));
        rbac.require(userId, space.getWorkspaceId(), "view_items");
        article.setId("ART-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        article.setStatus(article.getStatus() != null ? article.getStatus() : "DRAFT");
        article.setContentFormat(article.getContentFormat() != null ? article.getContentFormat() : "markdown");
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
        validateBlockEditor(updated);
        Article existingArticle = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        requireArticleAccess(existingArticle);
        return articleRepository.findById(id).map(a -> {
            a.setTitle(updated.getTitle());
            a.setContent(updated.getContent());
            a.setTemplateType(updated.getTemplateType());
            if (updated.getContentFormat() != null) {
                a.setContentFormat(updated.getContentFormat());
            }
            a.setContentBlocks(updated.getContentBlocks());
            // KR-033: sort order for page tree drag-to-reorder
            if (updated.getSortOrder() != null) {
                a.setSortOrder(updated.getSortOrder());
            }
            // KR-009: cover image — null to remove; must start with https:// or gradient:
            String ci = updated.getCoverImage();
            if (ci == null || ci.isBlank()) {
                a.setCoverImage(null);
            } else if (ci.startsWith("gradient:") || ci.startsWith("https://") || ci.startsWith("http://")) {
                a.setCoverImage(ci);
            } else {
                throw ApiException.badRequest("INVALID_COVER_IMAGE", "coverImage must be null, a gradient key, or an http(s) URL.", "coverImage");
            }
            // KR-010: icon — null to reset; short emoji or lucide: prefix
            a.setIcon(updated.getIcon());
            // KR-018: reviewer assignment — null to unassign
            a.setReviewerId(updated.getReviewerId());
            // KR-019: approval requirement
            a.setRequiresApproval(updated.isRequiresApproval());
            // KR-020: scheduled publish
            a.setScheduledPublishAt(updated.getScheduledPublishAt());
            // KR-021: review-by date
            a.setReviewByDate(updated.getReviewByDate());
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
        requireArticleAccess(a);
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

    /** Publish an already-PUBLISHED article to the customer portal KB (iteration 9, Cap N). */
    @PutMapping("/{id}/portal-publish")
    public Article portalPublish(@PathVariable String id) { return setPortalPublished(id, true); }

    /** Withdraw an article from the customer portal KB without un-publishing it internally. */
    @PutMapping("/{id}/portal-unpublish")
    public Article portalUnpublish(@PathVariable String id) { return setPortalPublished(id, false); }

    private Article setPortalPublished(String id, boolean published) {
        String userId = authenticatedUser.id();
        Article a = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        requireArticleAccess(a);
        if (published && !ArticleWorkflowService.PUBLISHED.equals(a.getStatus())) {
            throw ApiException.badRequest("NOT_PUBLISHED",
                    "Only a published article can be surfaced on the customer portal.");
        }
        a.setPortalPublished(published);
        a.setUpdatedAt(OffsetDateTime.now());
        Article saved = articleRepository.save(a);
        eventService.record(id, published ? "ARTICLE_PORTAL_PUBLISHED" : "ARTICLE_PORTAL_UNPUBLISHED",
                userId, Map.of("title", a.getTitle() == null ? "" : a.getTitle()));
        return saved;
    }

    @PostMapping("/{id}/vote")
    public Article voteHelpful(@PathVariable String id) {
        requireArticleById(id);
        articleDao.incrementHelpfulVotes(id);
        return articleRepository.findById(id).orElseThrow();
    }

    @PostMapping("/{id}/links")
    public Map<String, String> linkWorkItem(@PathVariable String id,
                                             @Valid @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        requireArticleById(id);
        String workItemId = body.get("workItemId");
        String linkType = body.getOrDefault("linkType", "RELATED");
        articleDao.linkWorkItem(id, workItemId, linkType, userId);
        return Map.of("message", "Link created");
    }

    @DeleteMapping("/{id}/links/{workItemId}")
    public ResponseEntity<Void> unlinkWorkItem(@PathVariable String id, @PathVariable String workItemId) {
        requireArticleById(id);
        articleDao.unlinkWorkItem(id, workItemId);
        return ResponseEntity.noContent().build();
    }

    // ── KR-022: Duplicate / clone ──────────────────────────────────────────────

    /** POST /api/v1/articles/{id}/duplicate — creates a DRAFT copy in the same space. */
    @PostMapping("/{id}/duplicate")
    public Article duplicateArticle(@PathVariable String id,
                                    @RequestParam String workspaceId) {
        // Controller: parse HTTP + delegate. RBAC and scoping are in ArticleService.
        return articleService.duplicate(id, authenticatedUser.id(), workspaceId);
    }

    // ── KR-038: Bulk operations ────────────────────────────────────────────────

    /** POST /api/v1/articles/bulk-archive — archives a list of articles (workspace-scoped). */
    @PostMapping("/bulk-archive")
    public ArticleService.BulkResult bulkArchive(@RequestParam String workspaceId,
                                                  @RequestBody BulkIdsRequest body) {
        return articleService.bulkArchive(body.ids(), authenticatedUser.id(), workspaceId);
    }

    /** POST /api/v1/articles/bulk-delete — deletes a list of articles (workspace-scoped). */
    @PostMapping("/bulk-delete")
    public ArticleService.BulkResult bulkDelete(@RequestParam String workspaceId,
                                                 @RequestBody BulkIdsRequest body) {
        return articleService.bulkDelete(body.ids(), authenticatedUser.id(), workspaceId);
    }

    /** Request body for bulk operations. */
    public record BulkIdsRequest(@NotEmpty List<String> ids) {}

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable String id) {
        Article existing = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        requireArticleAccess(existing);
        articleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /** Verify the caller belongs to the workspace that owns the article's space. Throws notFound if not. */
    private void requireArticleAccess(Article article) {
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", article.getId()));
        rbac.require(authenticatedUser.id(), space.getWorkspaceId(), "view_items");
    }

    /** Load an article by id and enforce workspace access (RB-40 §1) before any read/mutation. */
    private Article requireArticleById(String id) {
        Article article = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        requireArticleAccess(article);
        return article;
    }

    /** Validate: if content_format=blocks, content_blocks must be present and non-empty. */
    private void validateBlockEditor(Article article) {
        if ("blocks".equalsIgnoreCase(article.getContentFormat())) {
            String blocks = article.getContentBlocks();
            if (blocks == null || blocks.isBlank() || "[]".equals(blocks.trim())) {
                throw ApiException.badRequest("BLOCKS_REQUIRED",
                    "content_blocks must be present and non-empty when content_format is 'blocks'.",
                    "contentBlocks");
            }
        }
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
