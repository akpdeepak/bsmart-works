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
    private final ArticleWatcherService articleWatcherService;
    private final SpaceFollowerService spaceFollowerService;
    private final WebhookService webhookService;

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
                              ArticleService articleService,
                              ArticleWatcherService articleWatcherService,
                              SpaceFollowerService spaceFollowerService,
                              WebhookService webhookService) {
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
        this.articleWatcherService = articleWatcherService;
        this.spaceFollowerService = spaceFollowerService;
        this.webhookService = webhookService;
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
        recordArticleEvent(saved, "ARTICLE_VERSION_RESTORED", userId,
                Map.of("restoredFrom", versionNumber, "newVersion", saved.getVersionNumber()));
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

    @GetMapping("/{id}/activity")
    public List<AppEvent> getActivity(@PathVariable String id) {
        requireArticleById(id);
        return eventService.eventsFor(id);
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
        recordArticleEvent(saved, "ARTICLE_CREATED", userId,
                Map.of("title", saved.getTitle() == null ? "" : saved.getTitle()));
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
                throw ApiException.badRequest(
                        "INVALID_COVER_IMAGE",
                        "coverImage must be null, a gradient key, or an http(s) URL.",
                        "coverImage");
            }
            // KR-010: icon — null to reset; short emoji or lucide: prefix
            a.setIcon(updated.getIcon());
            a.setVersionNumber(a.getVersionNumber() + 1);
            a.setUpdatedAt(OffsetDateTime.now());
            Article saved = articleRepository.save(a);
            saveVersion(saved, userId);
            recordArticleEvent(saved, "ARTICLE_UPDATED", userId,
                    Map.of("version", saved.getVersionNumber()));
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

    // ── KR-022: Duplicate article ─────────────────────────────────────────────

    /**
     * POST /api/v1/articles/{id}/duplicate?workspaceId=...
     * Creates a copy of the article as a fresh DRAFT with "(copy)" title suffix.
     * RBAC and workspace isolation are enforced in ArticleService (RB-10 §2, RB-40 §1).
     */
    @PostMapping("/{id}/duplicate")
    public Article duplicate(@PathVariable String id, @RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        return articleService.duplicate(id, userId, workspaceId);
    }

    // ── KR-038: Bulk operations ───────────────────────────────────────────────

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
        KnowledgeSpace space = knowledgeSpaceRepository.findById(saved.getSpaceId()).orElse(null);
        String eventType = ArticleWorkflowService.PUBLISHED.equals(newStatus)
                ? "ARTICLE_PUBLISHED" : "ARTICLE_" + action.toUpperCase();
        if (space != null) {
            eventService.recordInWorkspace(space.getWorkspaceId(), id, eventType, userId,
                    Map.of("status", newStatus, "action", action));
            if (ArticleWorkflowService.PUBLISHED.equals(newStatus)) {
                spaceFollowerService.notifyFollowers(saved.getSpaceId(), space.getWorkspaceId(),
                        saved.getId(), userId);
                webhookService.enqueue(space.getWorkspaceId(), "ARTICLE_PUBLISHED",
                        Map.of("articleId", saved.getId(), "trigger", "workflow",
                                "action", action));
            }
        } else {
            eventService.record(id, eventType, userId, "{\"status\":\"" + newStatus + "\"}");
        }
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
        recordArticleEvent(saved, published ? "ARTICLE_PORTAL_PUBLISHED" : "ARTICLE_PORTAL_UNPUBLISHED",
                userId, Map.of("title", a.getTitle() == null ? "" : a.getTitle()));
        return saved;
    }

    // ── KR-020: Schedule for later publish ───────────────────────────────────────
    @PostMapping("/{id}/schedule-publish")
    public Article schedulePublish(@PathVariable String id,
                                   @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        String raw = body.get("scheduledAt");
        if (raw == null || raw.isBlank()) {
            throw ApiException.badRequest("SCHEDULED_AT_REQUIRED",
                    "scheduledAt is required.", "scheduledAt");
        }
        OffsetDateTime scheduledAt;
        try {
            scheduledAt = OffsetDateTime.parse(raw);
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_DATE_FORMAT",
                    "scheduledAt must be an ISO-8601 datetime with offset.", "scheduledAt");
        }
        Article article = requireArticleById(id);
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", id));
        return articleService.schedulePublish(id, userId, space.getWorkspaceId(), scheduledAt);
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

    @PostMapping("/{id}/move")
    public Article moveArticle(@PathVariable String id, @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        Article article = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        requireArticleAccess(article);
        String targetSpaceId = body.get("spaceId");
        if (targetSpaceId == null || targetSpaceId.isBlank()) {
            throw ApiException.badRequest("SPACE_REQUIRED", "spaceId is required.", "spaceId");
        }
        KnowledgeSpace targetSpace = knowledgeSpaceRepository.findById(targetSpaceId)
                .orElseThrow(() -> ApiException.notFound("Space", targetSpaceId));
        rbac.require(userId, targetSpace.getWorkspaceId(), "edit_items");
        String oldSpaceId = article.getSpaceId();
        article.setSpaceId(targetSpaceId);
        String parentId = body.get("parentId");
        article.setParentId(parentId == null || parentId.isBlank() ? null : parentId);
        article.setUpdatedAt(OffsetDateTime.now());
        Article saved = articleRepository.save(article);
        eventService.recordInWorkspace(targetSpace.getWorkspaceId(), id, "ARTICLE_MOVED", userId,
                Map.of("fromSpaceId", oldSpaceId == null ? "" : oldSpaceId, "toSpaceId", targetSpaceId));
        return saved;
    }

    // ── KR-066: public share link ──────────────────────────────────────────────

    /**
     * Generate (or return existing) public share token for a PUBLISHED article.
     * POST /api/v1/articles/{id}/share  →  { token }
     * RBAC: edit_items. Only PUBLISHED articles may be publicly shared.
     */
    @PostMapping("/{id}/share")
    public Map<String, String> generateShareToken(@PathVariable String id) {
        String userId = authenticatedUser.id();
        Article a = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        KnowledgeSpace space = knowledgeSpaceRepository.findById(a.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", id));
        rbac.require(userId, space.getWorkspaceId(), "edit_items");
        if (!ArticleWorkflowService.PUBLISHED.equals(a.getStatus())) {
            throw ApiException.badRequest("NOT_PUBLISHED",
                    "Only a published article can be shared publicly.", "status");
        }
        if (a.getPublicShareToken() == null) {
            a.setPublicShareToken(java.util.UUID.randomUUID().toString().replace("-", ""));
            a.setUpdatedAt(OffsetDateTime.now());
            articleRepository.save(a);
            recordArticleEvent(a, "ARTICLE_SHARE_GENERATED", userId, Map.of());
        }
        return Map.of("token", a.getPublicShareToken());
    }

    /**
     * Revoke the public share token for an article.
     * DELETE /api/v1/articles/{id}/share
     * RBAC: edit_items.
     */
    @DeleteMapping("/{id}/share")
    public ResponseEntity<Void> revokeShareToken(@PathVariable String id) {
        String userId = authenticatedUser.id();
        Article a = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        KnowledgeSpace space = knowledgeSpaceRepository.findById(a.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", id));
        rbac.require(userId, space.getWorkspaceId(), "edit_items");
        a.setPublicShareToken(null);
        a.setUpdatedAt(OffsetDateTime.now());
        articleRepository.save(a);
        recordArticleEvent(a, "ARTICLE_SHARE_REVOKED", userId, Map.of());
        return ResponseEntity.noContent().build();
    }

    // ── KR-038: bulk operations ────────────────────────────────────────────────

    /**
     * Bulk-archive a list of articles.
     * POST /api/v1/articles/bulk-archive  body: { ids: [string], workspaceId: string }
     * RBAC: edit_items (enforced in ArticleService).
     */
    @PostMapping("/bulk-archive")
    public Map<String, Object> bulkArchive(@RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        String workspaceId = (String) body.get("workspaceId");
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) body.get("ids");
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.", "workspaceId");
        }
        if (ids == null || ids.isEmpty()) {
            return Map.of("processed", List.of(), "skipped", List.of());
        }
        ArticleService.BulkResult result = articleService.bulkArchive(ids, userId, workspaceId);
        return Map.of("processed", result.processed(), "skipped", result.skipped());
    }

    /**
     * Bulk-delete a list of articles.
     * POST /api/v1/articles/bulk-delete  body: { ids: [string], workspaceId: string }
     * RBAC: delete_items (enforced in ArticleService).
     */
    @PostMapping("/bulk-delete")
    public Map<String, Object> bulkDelete(@RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        String workspaceId = (String) body.get("workspaceId");
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) body.get("ids");
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.", "workspaceId");
        }
        if (ids == null || ids.isEmpty()) {
            return Map.of("processed", List.of(), "skipped", List.of());
        }
        ArticleService.BulkResult result = articleService.bulkDelete(ids, userId, workspaceId);
        return Map.of("processed", result.processed(), "skipped", result.skipped());
    }

    /**
     * Bulk-publish a list of articles (workflow shortcut for managers).
     * POST /api/v1/articles/bulk-publish  body: { ids: [string], workspaceId: string }
     * RBAC: approve_items (enforced in service/workflow). Articles not in IN_REVIEW are skipped.
     */
    @PostMapping("/bulk-publish")
    public Map<String, Object> bulkPublish(@RequestBody Map<String, Object> body) {
        String userId = authenticatedUser.id();
        String workspaceId = (String) body.get("workspaceId");
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) body.get("ids");
        if (workspaceId == null || workspaceId.isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.", "workspaceId");
        }
        rbac.require(userId, workspaceId, "approve_items");
        if (ids == null || ids.isEmpty()) {
            return Map.of("processed", List.of(), "skipped", List.of());
        }
        List<String> processed = new java.util.ArrayList<>();
        List<String> skipped = new java.util.ArrayList<>();
        OffsetDateTime now = OffsetDateTime.now();
        for (String id : ids) {
            Article a = articleRepository.findById(id).orElse(null);
            if (a == null) {
                skipped.add(id);
                continue;
            }
            KnowledgeSpace space = knowledgeSpaceRepository.findById(a.getSpaceId()).orElse(null);
            if (space == null || !workspaceId.equals(space.getWorkspaceId())) {
                skipped.add(id);
                continue;
            }
            if (!ArticleWorkflowService.IN_REVIEW.equals(a.getStatus())) {
                skipped.add(id);
                continue;
            }
            a.setStatus(ArticleWorkflowService.PUBLISHED);
            a.setPublishedAt(now);
            a.setUpdatedAt(now);
            articleRepository.save(a);
            eventService.recordInWorkspace(workspaceId, id, "ARTICLE_PUBLISHED", userId, Map.of("bulk", true));
            spaceFollowerService.notifyFollowers(a.getSpaceId(), workspaceId, a.getId(), userId);
            webhookService.enqueue(workspaceId, "ARTICLE_PUBLISHED",
                    Map.of("articleId", a.getId(), "trigger", "bulk"));
            processed.add(id);
        }
        return Map.of("processed", processed, "skipped", skipped);
    }

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

    private void recordArticleEvent(Article article, String eventType, String userId, Map<String, ?> payload) {
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId()).orElse(null);
        if (space != null) {
            eventService.recordInWorkspace(space.getWorkspaceId(), article.getId(), eventType, userId, payload);
            if ("ARTICLE_PUBLISHED".equals(eventType)) {
                webhookService.enqueue(space.getWorkspaceId(), eventType,
                        Map.of("articleId", article.getId(), "trigger", "article_event"));
            }
        } else {
            eventService.record(article.getId(), eventType, userId, payload);
        }
    }
}
