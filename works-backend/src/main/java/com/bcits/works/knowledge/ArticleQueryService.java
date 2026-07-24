package com.bcits.works.knowledge;
import com.bcits.works.knowledge.api.Article;
import com.bcits.works.knowledge.api.ArticleRepository;
import com.bcits.works.knowledge.api.KnowledgeSpace;
import com.bcits.works.knowledge.api.KnowledgeSpaceRepository;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AppEvent;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Read side of the article surface (RB-10 §2 — one job per layer). Carved out of
 * {@link ArticleService} so the command service keeps a single responsibility.
 *
 * <p>Tenant isolation (RB-40 §1): articles have no direct {@code workspace_id} — tenancy is derived
 * through their {@code knowledge_spaces} parent. {@link #requireArticleAccess} /
 * {@link #requireArticleById} are the single tenant/RBAC choke point for by-id access, and the
 * command service ({@link ArticleService}) delegates its loads here so there is exactly one such
 * choke point rather than two copies.
 *
 * <p>Behaviour is preserved verbatim from the pre-split {@code ArticleService}; every {@code rbac.require}
 * and workspace-scoped repository call is moved unchanged.
 */
@Service
public class ArticleQueryService {

    private final ArticleRepository articleRepository;
    private final ArticleVersionRepository articleVersionRepository;
    private final ArticleCommentRepository articleCommentRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final ArticleAnalyticsService analyticsService;
    private final ArticleDiffService diffService;
    private final ArticleDao articleDao;
    private final EventService eventService;
    private final RbacGate rbac;

    public ArticleQueryService(ArticleRepository articleRepository,
                               ArticleVersionRepository articleVersionRepository,
                               ArticleCommentRepository articleCommentRepository,
                               KnowledgeSpaceRepository knowledgeSpaceRepository,
                               ArticleAnalyticsService analyticsService,
                               ArticleDiffService diffService,
                               ArticleDao articleDao,
                               EventService eventService,
                               RbacGate rbac) {
        this.articleRepository = articleRepository;
        this.articleVersionRepository = articleVersionRepository;
        this.articleCommentRepository = articleCommentRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.analyticsService = analyticsService;
        this.diffService = diffService;
        this.articleDao = articleDao;
        this.eventService = eventService;
        this.rbac = rbac;
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
}
