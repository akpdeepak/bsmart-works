package com.bcits.works.knowledge;

import com.bcits.works.WebhookService;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Command side of the article surface — create, update, workflow, publishing, move, sharing, and
 * bulk operations. RBAC and workspace scoping live here (RB-10 §2, RB-40 §1); {@link ArticleController}
 * is a thin HTTP delegate. The read side lives in {@link ArticleQueryService}.
 *
 * Tenant isolation (RB-40 §1): articles have no direct workspace_id — tenancy is derived
 * through their {@code knowledge_spaces} parent. The by-id tenant/RBAC choke points
 * ({@code requireArticleAccess} / {@code requireArticleById}) live in {@link ArticleQueryService};
 * this service delegates its loads there so there is exactly one such choke point.
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
    private final ArticleDao articleDao;
    private final EventService eventService;
    private final RbacGate rbac;
    private final WebhookService webhookService;
    private final ArticleQueryService queryService;

    public ArticleService(ArticleRepository articleRepository,
                          ArticleVersionRepository articleVersionRepository,
                          KnowledgeSpaceRepository knowledgeSpaceRepository,
                          ArticleDao articleDao,
                          EventService eventService,
                          RbacGate rbac,
                          WebhookService webhookService,
                          ArticleQueryService queryService) {
        this.articleRepository = articleRepository;
        this.articleVersionRepository = articleVersionRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.articleDao = articleDao;
        this.eventService = eventService;
        this.rbac = rbac;
        this.webhookService = webhookService;
        this.queryService = queryService;
    }

    // ── Tenant/RBAC access (RB-40 §1) — the single by-id choke points, owned by ArticleQueryService ─

    /** Verify the caller belongs to the workspace that owns the article's space. Throws notFound if not. */
    void requireArticleAccess(Article article, String userId) {
        queryService.requireArticleAccess(article, userId);
    }

    /** Load an article by id and enforce workspace access (RB-40 §1) before any read/mutation. */
    Article requireArticleById(String id, String userId) {
        return queryService.requireArticleById(id, userId);
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

    // ── Portal publish (workflow transitions, scheduling & approval live in ArticlePublishingService) ─

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

}
