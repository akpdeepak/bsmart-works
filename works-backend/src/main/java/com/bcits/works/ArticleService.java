package com.bcits.works;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Business logic for cross-cutting article operations.
 * RBAC and workspace scoping live here (RB-10 §2, RB-40 §1).
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
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final ArticleApprovalRepository approvalRepository;
    private final EventService eventService;
    private final RbacService rbac;
    private final WebhookService webhookService;

    public ArticleService(ArticleRepository articleRepository,
                          ArticleVersionRepository articleVersionRepository,
                          KnowledgeSpaceRepository knowledgeSpaceRepository,
                          ArticleApprovalRepository approvalRepository,
                          EventService eventService,
                          RbacService rbac,
                          WebhookService webhookService) {
        this.articleRepository = articleRepository;
        this.articleVersionRepository = articleVersionRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.approvalRepository = approvalRepository;
        this.eventService = eventService;
        this.rbac = rbac;
        this.webhookService = webhookService;
    }

    // ── KR-020: Schedule publish ──────────────────────────────────────────────

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
