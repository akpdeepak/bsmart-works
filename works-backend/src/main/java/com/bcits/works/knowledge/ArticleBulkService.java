package com.bcits.works.knowledge;
import com.bcits.works.knowledge.api.Article;
import com.bcits.works.knowledge.api.ArticleRepository;
import com.bcits.works.knowledge.api.KnowledgeSpace;
import com.bcits.works.knowledge.api.KnowledgeSpaceRepository;

import com.bcits.works.WebhookService;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * KR-038: bulk article operations, carved out of {@link ArticleService} (RB-10 §2 — one job per
 * layer). Each operation is workspace-scoped (RB-40 §1): the caller is authorized once against the
 * target workspace, then every id is re-checked to belong to that workspace and foreign or missing
 * ids are silently skipped rather than leaked or failed.
 *
 * <p>Behaviour is preserved verbatim from the pre-split {@code ArticleService}.
 */
@Service
public class ArticleBulkService {

    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final EventService eventService;
    private final RbacGate rbac;
    private final WebhookService webhookService;
    private final SpaceFollowerService spaceFollowerService;

    public ArticleBulkService(ArticleRepository articleRepository,
                              KnowledgeSpaceRepository knowledgeSpaceRepository,
                              EventService eventService,
                              RbacGate rbac,
                              WebhookService webhookService,
                              SpaceFollowerService spaceFollowerService) {
        this.articleRepository = articleRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.eventService = eventService;
        this.rbac = rbac;
        this.webhookService = webhookService;
        this.spaceFollowerService = spaceFollowerService;
    }

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

    /** Returns true when the article's space belongs to the given workspaceId (RB-40 §1). */
    private boolean isInWorkspace(Article article, String workspaceId) {
        return knowledgeSpaceRepository.findById(article.getSpaceId())
                .map(ks -> workspaceId.equals(ks.getWorkspaceId()))
                .orElse(false);
    }
}
