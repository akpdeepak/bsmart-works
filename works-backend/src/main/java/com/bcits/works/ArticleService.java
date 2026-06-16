package com.bcits.works;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Business logic for cross-cutting article operations.
 * RBAC and workspace scoping live here (RB-10 §2, RB-40 §1).
 *
 * KR-022: duplicate / clone an article (fresh DRAFT copy, "(copy)" title suffix,
 *         fresh version history).
 * KR-038: bulk-archive and bulk-delete with workspace-scoped filtering.
 */
@Service
public class ArticleService {

    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository articleVersionRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final EventService eventService;
    private final RbacService rbac;

    public ArticleService(ArticleRepository articleRepository,
                          ArticleVersionRepository articleVersionRepository,
                          KnowledgeSpaceRepository knowledgeSpaceRepository,
                          EventService eventService,
                          RbacService rbac) {
        this.articleRepository = articleRepository;
        this.articleVersionRepository = articleVersionRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.eventService = eventService;
        this.rbac = rbac;
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
}
