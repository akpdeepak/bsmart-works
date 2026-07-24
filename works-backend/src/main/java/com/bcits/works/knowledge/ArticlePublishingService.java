package com.bcits.works.knowledge;
import com.bcits.works.knowledge.api.Article;
import com.bcits.works.knowledge.api.ArticleRepository;
import com.bcits.works.knowledge.api.KnowledgeSpace;
import com.bcits.works.knowledge.api.KnowledgeSpaceRepository;

import com.bcits.works.WebhookService;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Publishing lifecycle for articles — the status transition machine (KR-019 approval, KR-020
 * scheduled publish) — carved out of {@link ArticleService} (RB-10 §2, one job per layer).
 *
 * <p>RBAC and workspace scoping live here (RB-40 §1). The by-id tenant/RBAC choke points are
 * delegated to {@link ArticleQueryService}; {@code requireInWorkspace} — the workspace-equality
 * load shared only by the schedule/approve paths — moves here with them. Behaviour is preserved
 * verbatim from the pre-split {@code ArticleService}.
 */
@Service
public class ArticlePublishingService {

    private final ArticleRepository articleRepository;
    private final ArticleApprovalRepository approvalRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final ArticleWorkflowService workflowService;
    private final EventService eventService;
    private final RbacGate rbac;
    private final WebhookService webhookService;
    private final SpaceFollowerService spaceFollowerService;
    private final ArticleQueryService queryService;

    public ArticlePublishingService(ArticleRepository articleRepository,
                                    ArticleApprovalRepository approvalRepository,
                                    KnowledgeSpaceRepository knowledgeSpaceRepository,
                                    ArticleWorkflowService workflowService,
                                    EventService eventService,
                                    RbacGate rbac,
                                    WebhookService webhookService,
                                    SpaceFollowerService spaceFollowerService,
                                    ArticleQueryService queryService) {
        this.articleRepository = articleRepository;
        this.approvalRepository = approvalRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.workflowService = workflowService;
        this.eventService = eventService;
        this.rbac = rbac;
        this.webhookService = webhookService;
        this.spaceFollowerService = spaceFollowerService;
        this.queryService = queryService;
    }

    // ── Publishing workflow ───────────────────────────────────────────────────

    public Article applyTransition(String id, String action, String userId) {
        Article a = articleRepository.findById(id).orElseThrow();
        queryService.requireArticleAccess(a, userId);
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

    // ── KR-020: Schedule publish ──────────────────────────────────────────────

    /**
     * Controller-facing overload: enforces read access, resolves the article's own workspace,
     * then delegates to the workspace-scoped {@link #schedulePublish(String, String, String, OffsetDateTime)}.
     */
    public Article schedulePublish(String id, String userId, OffsetDateTime scheduledAt) {
        Article article = queryService.requireArticleById(id, userId);
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
