package com.bcits.works.knowledge;

import com.bcits.works.WebhookService;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AppEvent;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Business logic for article operations — the article command + read service.
 * RBAC and workspace scoping live here (RB-10 §2, RB-40 §1); {@link ArticleController}
 * is a thin HTTP delegate.
 *
 * Tenant isolation (RB-40 §1): articles have no direct workspace_id — tenancy is derived
 * through their {@code knowledge_spaces} parent. {@link #requireArticleAccess} /
 * {@link #requireArticleById} are the single tenant/RBAC choke points for by-id access.
 *
 * KR-018: reviewer assignment with optional due date.
 * KR-019: approval workflow — submit, approve, auto-publish when threshold is met.
 * KR-020: scheduled publish — set a future publish timestamp.
 * KR-021: stale flag driven by review_by_date (stamped by ArticleStalenessChecker).
 * KR-022: duplicate / clone an article (fresh DRAFT copy, "(copy)" title suffix,
 *         fresh version history).
 * KR-038: bulk-archive and bulk-delete with workspace-scoped filtering.
 */
@Service
public class ArticleService {

    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository articleVersionRepository;
    private final ArticleCommentRepository articleCommentRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final ArticleApprovalRepository approvalRepository;
    private final ArticleWorkflowService workflowService;
    private final ArticleAnalyticsService analyticsService;
    private final ArticleDiffService diffService;
    private final ArticleDao articleDao;
    private final EventService eventService;
    private final RbacGate rbac;
    private final WebhookService webhookService;
    private final SpaceFollowerService spaceFollowerService;

    public ArticleService(ArticleRepository articleRepository,
                          ArticleVersionRepository articleVersionRepository,
                          ArticleCommentRepository articleCommentRepository,
                          KnowledgeSpaceRepository knowledgeSpaceRepository,
                          ArticleApprovalRepository approvalRepository,
                          ArticleWorkflowService workflowService,
                          ArticleAnalyticsService analyticsService,
                          ArticleDiffService diffService,
                          ArticleDao articleDao,
                          EventService eventService,
                          RbacGate rbac,
                          WebhookService webhookService,
                          SpaceFollowerService spaceFollowerService) {
        this.articleRepository = articleRepository;
        this.articleVersionRepository = articleVersionRepository;
        this.articleCommentRepository = articleCommentRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.approvalRepository = approvalRepository;
        this.workflowService = workflowService;
        this.analyticsService = analyticsService;
        this.diffService = diffService;
        this.articleDao = articleDao;
        this.eventService = eventService;
        this.rbac = rbac;
        this.webhookService = webhookService;
        this.spaceFollowerService = spaceFollowerService;
    }

    // ── Tenant/RBAC access (RB-40 §1) — the single by-id choke points ─────────

    /** Verify the caller belongs to the workspace that owns the article's space. Throws notFound if not. */
    void requireArticleAccess(Article article, String userId) {
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", article.getId()));
        rbac.require(userId, space.getWorkspaceId(), "view_items");
    }

    /** Load an article by id and enforce workspace access (RB-40 §1) before any read/mutation. */
    Article requireArticleById(String id, String userId) {
        Article article = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        requireArticleAccess(article, userId);
        return article;
    }

    // ── Reads ─────────────────────────────────────────────────────────────────

    /** List articles — every path is workspace-scoped (RB-40 §1) via the ...ScopedToUser repo queries. */
    public List<Article> list(String spaceId, String query, String search, int page, int size, String userId) {
        String q = query != null ? query : search;
        org.springframework.data.domain.Pageable pageable =
            PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200));
        if (q != null && !q.isBlank()) {
            recordSearchTerm(q);
            return articleRepository.findByTitleScopedToUser(q, userId, pageable).getContent();
        }
        return spaceId != null
            ? articleRepository.findBySpaceIdScopedToUser(spaceId, userId, pageable).getContent()
            : articleRepository.findAllScopedToUser(userId, pageable).getContent();
    }

    /** Workspace-wide top search terms (analytics) — not article-scoped. */
    public List<Map<String, Object>> topSearchTerms(int limit) {
        return articleDao.topSearchTerms(limit);
    }

    private void recordSearchTerm(String raw) {
        String term = analyticsService.normalizeSearchTerm(raw);
        if (term == null) return;
        articleDao.recordSearchTerm(term);
    }

    /** Fetch a single article for reading, enforcing access and incrementing the view count. */
    public Article getForRead(String id, String userId) {
        Article article = articleRepository.findById(id).orElseThrow();
        requireArticleAccess(article, userId);
        articleDao.incrementViewCount(id);
        article.setViewCount(article.getViewCount() + 1);
        return article;
    }

    /** Direct children of an article, for hierarchical navigation. */
    public List<Article> getChildren(String id, String userId) {
        Article parent = articleRepository.findById(id).orElseThrow();
        requireArticleAccess(parent, userId);
        return articleRepository.findByParentIdOrderByUpdatedAtDesc(id);
    }

    public List<ArticleVersion> getVersions(String id, int page, int size, String userId) {
        requireArticleById(id, userId);
        int limit = Math.min(Math.max(size, 1), 200);
        return articleVersionRepository.findByArticleIdOrderByVersionNumberDesc(id,
            PageRequest.of(Math.max(page, 0), limit)).getContent();
    }

    /** Line-level diff between two stored versions, for the version "diff view". */
    public Map<String, Object> diffVersions(String id, Integer from, Integer to, String userId) {
        requireArticleById(id, userId);
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

    public List<Map<String, Object>> getArticleLinks(String id, String userId) {
        requireArticleById(id, userId);
        return articleDao.articleLinks(id);
    }

    public Map<String, Object> getAnalytics(String id, String userId) {
        Article a = requireArticleById(id, userId);
        long citations = articleDao.countCitations(id);
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

    public List<AppEvent> getActivity(String id, String userId) {
        requireArticleById(id, userId);
        return eventService.eventsFor(id);
    }

    // ── Create / update ─────────────────────────────────────────────────────────

    public Article create(Article article, String userId) {
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
        saveVersion(saved, userId);
        recordArticleEvent(saved, "ARTICLE_CREATED", userId,
                Map.of("title", saved.getTitle() == null ? "" : saved.getTitle()));
        return saved;
    }

    // Content edits only — status changes go through the workflow endpoints so the
    // Author -> Review -> Publish gate cannot be bypassed (CLAUDE.md §5 iteration 5).
    public Article update(String id, Article updated, String userId) {
        validateBlockEditor(updated);
        Article existingArticle = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        requireArticleAccess(existingArticle, userId);
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

    // Restore a prior version: copies its title/content onto the article as a new
    // version (history is preserved — the restore is itself the latest version).
    public Article restoreVersion(String id, Integer versionNumber, String userId) {
        Article a = requireArticleById(id, userId);
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

    // ── Publishing workflow ───────────────────────────────────────────────────

    public Article applyTransition(String id, String action, String userId) {
        Article a = articleRepository.findById(id).orElseThrow();
        requireArticleAccess(a, userId);
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

    public Article setPortalPublished(String id, boolean published, String userId) {
        Article a = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        requireArticleAccess(a, userId);
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

    // ── KR-020: Schedule publish ──────────────────────────────────────────────

    /**
     * Controller-facing overload: enforces read access, resolves the article's own workspace,
     * then delegates to the workspace-scoped {@link #schedulePublish(String, String, String, OffsetDateTime)}.
     */
    public Article schedulePublish(String id, String userId, OffsetDateTime scheduledAt) {
        Article article = requireArticleById(id, userId);
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", id));
        return schedulePublish(id, userId, space.getWorkspaceId(), scheduledAt);
    }

    /**
     * Sets a future scheduled publish time on an article in DRAFT or IN_REVIEW state.
     * The article status moves to "SCHEDULED"; ArticleScheduledPublisher picks it up.
     * RBAC: update_items required.
     * Workspace isolation (RB-40 §1): article must belong to workspaceId.
     */
    public Article schedulePublish(String articleId, String userId, String workspaceId,
                                   OffsetDateTime scheduledAt) {
        if (scheduledAt == null || !scheduledAt.isAfter(OffsetDateTime.now())) {
            throw ApiException.badRequest("INVALID_SCHEDULED_DATE",
                    "scheduledAt must be a future date.", "scheduledAt");
        }
        Article article = requireInWorkspace(articleId, workspaceId);
        rbac.require(userId, workspaceId, "update_items");
        String current = article.getStatus();
        if (!"DRAFT".equals(current) && !"IN_REVIEW".equals(current)) {
            throw ApiException.badRequest("INVALID_STATE",
                    "Only DRAFT or IN_REVIEW articles can be scheduled for publish.");
        }
        article.setStatus("SCHEDULED");
        article.setScheduledPublishAt(scheduledAt);
        article.setUpdatedAt(OffsetDateTime.now());
        Article saved = articleRepository.save(article);
        eventService.recordInWorkspace(workspaceId, articleId, "ARTICLE_SCHEDULED", userId,
                Map.of("scheduledAt", scheduledAt.toString()));
        return saved;
    }

    // ── KR-019: Approval workflow ──────────────────────────────────────────────

    /**
     * Records an approval decision (APPROVED or CHANGES_REQUESTED).
     * Author cannot approve their own article.
     * If APPROVED count >= space.required_approvals the article auto-publishes.
     * RBAC: update_items.
     * Workspace isolation (RB-40 §1): article must belong to workspaceId.
     */
    public ArticleApproval approveArticle(String articleId, String userId,
                                          String workspaceId, String decision, String comment) {
        if (!"APPROVED".equals(decision) && !"CHANGES_REQUESTED".equals(decision)) {
            throw ApiException.badRequest("INVALID_DECISION",
                    "decision must be APPROVED or CHANGES_REQUESTED.", "decision");
        }
        Article article = requireInWorkspace(articleId, workspaceId);
        rbac.require(userId, workspaceId, "update_items");
        if (userId.equals(article.getAuthorId())) {
            throw ApiException.forbidden("An author cannot approve their own article.");
        }
        if (!"IN_REVIEW".equals(article.getStatus())) {
            throw ApiException.badRequest("INVALID_STATE",
                    "Approvals can only be submitted for articles in IN_REVIEW status.");
        }

        // Persist the approval
        OffsetDateTime now = OffsetDateTime.now();
        ArticleApproval approval = new ArticleApproval();
        approval.setId("APR-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        approval.setArticleId(articleId);
        approval.setReviewerId(userId);
        approval.setWorkspaceId(workspaceId);
        approval.setDecision(decision);
        approval.setComment(comment);
        approval.setCreatedAt(now);
        ArticleApproval saved = approvalRepository.save(approval);

        eventService.recordInWorkspace(workspaceId, articleId, "ARTICLE_APPROVAL_SUBMITTED",
                userId, Map.of("decision", decision));

        // Auto-publish check: count APPROVED rows vs. space's required_approvals threshold
        if ("APPROVED".equals(decision)) {
            KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
                    .orElse(null);
            int required = (space != null && space.getRequiredApprovals() != null)
                    ? space.getRequiredApprovals() : 1;
            int approvals = approvalRepository.countByArticleIdAndWorkspaceIdAndDecision(
                    articleId, workspaceId, "APPROVED");
            if (approvals >= required) {
                article.setStatus("PUBLISHED");
                article.setPublishedAt(now);
                article.setUpdatedAt(now);
                articleRepository.save(article);
                eventService.recordInWorkspace(workspaceId, articleId,
                        "ARTICLE_PUBLISHED", userId,
                        Map.of("trigger", "auto_approval", "approvals", approvals));
                webhookService.enqueue(workspaceId, "ARTICLE_PUBLISHED",
                        Map.of("articleId", articleId, "trigger", "auto_approval",
                                "approvals", approvals));
            }
        }

        return saved;
    }

    // ── Move ────────────────────────────────────────────────────────────────────

    public Article move(String id, String targetSpaceId, String parentId, String userId) {
        Article article = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        requireArticleAccess(article, userId);
        if (targetSpaceId == null || targetSpaceId.isBlank()) {
            throw ApiException.badRequest("SPACE_REQUIRED", "spaceId is required.", "spaceId");
        }
        KnowledgeSpace targetSpace = knowledgeSpaceRepository.findById(targetSpaceId)
                .orElseThrow(() -> ApiException.notFound("Space", targetSpaceId));
        rbac.require(userId, targetSpace.getWorkspaceId(), "edit_items");
        String oldSpaceId = article.getSpaceId();
        article.setSpaceId(targetSpaceId);
        article.setParentId(parentId == null || parentId.isBlank() ? null : parentId);
        article.setUpdatedAt(OffsetDateTime.now());
        Article saved = articleRepository.save(article);
        eventService.recordInWorkspace(targetSpace.getWorkspaceId(), id, "ARTICLE_MOVED", userId,
                Map.of("fromSpaceId", oldSpaceId == null ? "" : oldSpaceId, "toSpaceId", targetSpaceId));
        return saved;
    }

    // ── KR-066: public share link ──────────────────────────────────────────────

    /** Generate (or return existing) public share token for a PUBLISHED article. RBAC: edit_items. */
    public String generateShareToken(String id, String userId) {
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
        return a.getPublicShareToken();
    }

    /** Revoke the public share token for an article. RBAC: edit_items. */
    public void revokeShareToken(String id, String userId) {
        Article a = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        KnowledgeSpace space = knowledgeSpaceRepository.findById(a.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", id));
        rbac.require(userId, space.getWorkspaceId(), "edit_items");
        a.setPublicShareToken(null);
        a.setUpdatedAt(OffsetDateTime.now());
        articleRepository.save(a);
        recordArticleEvent(a, "ARTICLE_SHARE_REVOKED", userId, Map.of());
    }

    // ── Simple mutations ──────────────────────────────────────────────────────

    public Article voteHelpful(String id, String userId) {
        requireArticleById(id, userId);
        articleDao.incrementHelpfulVotes(id);
        return articleRepository.findById(id).orElseThrow();
    }

    public void linkWorkItem(String id, String workItemId, String linkType, String userId) {
        requireArticleById(id, userId);
        articleDao.linkWorkItem(id, workItemId, linkType, userId);
    }

    public void unlinkWorkItem(String id, String workItemId, String userId) {
        requireArticleById(id, userId);
        articleDao.unlinkWorkItem(id, workItemId);
    }

    public void delete(String id, String userId) {
        Article existing = articleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Article", id));
        requireArticleAccess(existing, userId);
        articleRepository.deleteById(id);
    }

    // ── KR-022: Duplicate / clone ──────────────────────────────────────────────

    /**
     * Creates a copy of the given article in the same space with:
     * - title = source.title + " (copy)"
     * - status = DRAFT
     * - versionNumber = 1 (fresh history)
     * - new UUID, createdAt = now
     *
     * Workspace isolation (RB-40 §1): the source article's space must belong to
     * workspaceId — otherwise a 404 is thrown so cross-tenant callers cannot
     * discover articles in other workspaces.
     *
     * RBAC: caller must have create_items in the workspace.
     */
    public Article duplicate(String sourceId, String userId, String workspaceId) {
        // Load and workspace-scope (RB-40 §1)
        Article source = articleRepository.findById(sourceId)
                .orElseThrow(() -> ApiException.notFound("Article", sourceId));
        KnowledgeSpace space = knowledgeSpaceRepository.findById(source.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", sourceId));
        if (!workspaceId.equals(space.getWorkspaceId())) {
            throw ApiException.notFound("Article", sourceId);
        }

        // RBAC in the service layer (RB-10 §2)
        rbac.require(userId, workspaceId, "create_items");

        // Build the copy
        OffsetDateTime now = OffsetDateTime.now();
        Article copy = new Article();
        copy.setId("ART-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        copy.setSpaceId(source.getSpaceId());
        copy.setParentId(source.getParentId());
        copy.setTitle((source.getTitle() == null ? "Untitled" : source.getTitle()) + " (copy)");
        copy.setContent(source.getContent());
        copy.setContentFormat(source.getContentFormat() != null ? source.getContentFormat() : "markdown");
        copy.setContentBlocks(source.getContentBlocks());
        copy.setTemplateType(source.getTemplateType());
        copy.setStatus("DRAFT");
        copy.setVersionNumber(1);
        copy.setHelpfulVotes(0);
        copy.setViewCount(0);
        copy.setAuthorId(userId);
        copy.setCreatedBy(userId);
        copy.setCreatedAt(now);
        copy.setUpdatedAt(now);
        // Do not copy reviewer — fresh slate
        copy.setReviewerId(null);

        Article saved = articleRepository.save(copy);

        // Snapshot version 1 of the new article
        ArticleVersion v = new ArticleVersion();
        v.setArticleId(saved.getId());
        v.setVersionNumber(1);
        v.setTitle(saved.getTitle());
        v.setContent(saved.getContent());
        v.setSavedBy(userId);
        v.setSavedAt(now);
        articleVersionRepository.save(v);

        eventService.record(saved.getId(), "ARTICLE_DUPLICATED", userId,
                "{\"sourceId\":\"" + sourceId + "\",\"title\":\"" + saved.getTitle() + "\"}");

        return saved;
    }

    // ── KR-038: Bulk operations ────────────────────────────────────────────────

    /**
     * Result of a bulk operation.
     *
     * @param processed IDs that were mutated.
     * @param skipped   IDs that were skipped (not found in the caller's workspace).
     */
    public record BulkResult(List<String> processed, List<String> skipped) {}

    /**
     * Archives all articles in {@code ids} that belong to {@code workspaceId}.
     * IDs from another workspace are silently skipped (no cross-tenant leakage).
     * RBAC: caller must have edit_items.
     */
    public BulkResult bulkArchive(List<String> ids, String userId, String workspaceId) {
        rbac.require(userId, workspaceId, "edit_items");
        List<String> processed = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        OffsetDateTime now = OffsetDateTime.now();

        for (String id : ids) {
            Article article = articleRepository.findById(id).orElse(null);
            if (article == null || !isInWorkspace(article, workspaceId)) {
                skipped.add(id);
                continue;
            }
            article.setStatus("ARCHIVED");
            article.setUpdatedAt(now);
            articleRepository.save(article);
            eventService.record(id, "ARTICLE_ARCHIVE", userId, "{\"status\":\"ARCHIVED\"}");
            processed.add(id);
        }
        return new BulkResult(processed, skipped);
    }

    /**
     * Deletes all articles in {@code ids} that belong to {@code workspaceId}.
     * IDs from another workspace are silently skipped (no cross-tenant leakage).
     * RBAC: caller must have delete_items.
     */
    public BulkResult bulkDelete(List<String> ids, String userId, String workspaceId) {
        rbac.require(userId, workspaceId, "delete_items");
        List<String> processed = new ArrayList<>();
        List<String> skipped = new ArrayList<>();

        for (String id : ids) {
            Article article = articleRepository.findById(id).orElse(null);
            if (article == null || !isInWorkspace(article, workspaceId)) {
                skipped.add(id);
                continue;
            }
            articleRepository.deleteById(id);
            processed.add(id);
        }
        return new BulkResult(processed, skipped);
    }

    /**
     * Bulk-publish articles in IN_REVIEW that belong to {@code workspaceId} (manager shortcut).
     * RBAC: approve_items. Per-item workspace equality is re-checked; non-IN_REVIEW/foreign items skipped.
     */
    public BulkResult bulkPublish(List<String> ids, String userId, String workspaceId) {
        rbac.require(userId, workspaceId, "approve_items");
        List<String> processed = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
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
        return new BulkResult(processed, skipped);
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

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

    /** Returns true when the article's space belongs to the given workspaceId (RB-40 §1). */
    private boolean isInWorkspace(Article article, String workspaceId) {
        return knowledgeSpaceRepository.findById(article.getSpaceId())
                .map(ks -> workspaceId.equals(ks.getWorkspaceId()))
                .orElse(false);
    }

    /**
     * Loads an article and verifies it belongs to workspaceId.
     * Throws notFound if the article or space is missing, or belongs to a different workspace.
     */
    Article requireInWorkspace(String articleId, String workspaceId) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        KnowledgeSpace space = knowledgeSpaceRepository.findById(article.getSpaceId())
                .orElseThrow(() -> ApiException.notFound("Article", articleId));
        if (!workspaceId.equals(space.getWorkspaceId())) {
            throw ApiException.notFound("Article", articleId);
        }
        return article;
    }
}
