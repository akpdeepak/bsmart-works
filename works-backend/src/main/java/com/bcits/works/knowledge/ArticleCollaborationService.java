package com.bcits.works.knowledge;
import com.bcits.works.knowledge.api.Article;
import com.bcits.works.knowledge.api.ArticleRepository;
import com.bcits.works.knowledge.api.KnowledgeSpace;
import com.bcits.works.knowledge.api.KnowledgeSpaceRepository;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Multi-author collaboration on knowledge articles (iteration-20 Cap I). The caller
 * ({@link ArticleCollaborationController}) applies RBAC — workspace membership ({@code view_items}) to
 * read the roster, {@code create_items} to add/remove a co-author. Every method is workspace-scoped
 * (RB-40 §1): the article must belong to {@code workspaceId} (resolved via its knowledge space) and
 * author rows are filtered on {@code workspaceId}, so the roster can never be read or mutated across the
 * tenant boundary — a foreign article is a {@code NOT_FOUND}.
 */
@Service
public class ArticleCollaborationService {

    static final Set<String> ROLES = Set.of(ArticleAuthor.AUTHOR, ArticleAuthor.CO_AUTHOR, ArticleAuthor.REVIEWER);

    private final ArticleAuthorRepository authors;
    private final ArticleRepository articles;
    private final KnowledgeSpaceRepository spaces;
    private final EventService events;

    public ArticleCollaborationService(ArticleAuthorRepository authors, ArticleRepository articles,
                                       KnowledgeSpaceRepository spaces, EventService events) {
        this.authors = authors;
        this.articles = articles;
        this.spaces = spaces;
        this.events = events;
    }

    /** The co-author roster for an article, scoped to its workspace. */
    public List<ArticleAuthor> listAuthors(String workspaceId, String articleId) {
        requireArticleInWorkspace(workspaceId, articleId);
        return authors.findByWorkspaceIdAndArticleIdOrderByAddedAtAsc(workspaceId, articleId);
    }

    public ArticleAuthor addAuthor(String workspaceId, String userId, String articleId,
                                   String targetUserId, String role) {
        requireArticleInWorkspace(workspaceId, articleId);
        if (targetUserId == null || targetUserId.isBlank()) {
            throw ApiException.badRequest("USER_REQUIRED", "A user to add is required.", "userId");
        }
        String normalizedRole = normalizeRole(role);
        ArticleAuthor existing = authors.findByArticleIdAndUserId(articleId, targetUserId).orElse(null);
        if (existing != null) {
            // Idempotent: re-adding updates the collaboration role rather than duplicating the row.
            existing.setRole(normalizedRole);
            ArticleAuthor saved = authors.save(existing);
            events.recordInWorkspace(workspaceId, articleId, "ARTICLE_AUTHOR_UPDATED", userId,
                java.util.Map.of("userId", targetUserId, "role", normalizedRole));
            return saved;
        }
        ArticleAuthor a = new ArticleAuthor();
        a.setId("AAU-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        a.setWorkspaceId(workspaceId);
        a.setArticleId(articleId);
        a.setUserId(targetUserId);
        a.setRole(normalizedRole);
        a.setAddedBy(userId);
        a.setAddedAt(OffsetDateTime.now());
        ArticleAuthor saved = authors.save(a);
        events.recordInWorkspace(workspaceId, articleId, "ARTICLE_AUTHOR_ADDED", userId,
            java.util.Map.of("userId", targetUserId, "role", normalizedRole));
        return saved;
    }

    public void removeAuthor(String workspaceId, String userId, String articleId, String targetUserId) {
        requireArticleInWorkspace(workspaceId, articleId);
        ArticleAuthor a = authors.findByArticleIdAndUserId(articleId, targetUserId)
            .filter(x -> workspaceId.equals(x.getWorkspaceId()))
            .orElseThrow(() -> ApiException.notFound("Article author", targetUserId));
        authors.delete(a);
        events.recordInWorkspace(workspaceId, articleId, "ARTICLE_AUTHOR_REMOVED", userId,
            java.util.Map.of("userId", targetUserId));
    }

    // ── workspace scoping ────────────────────────────────────────────────────────

    /** Resolve the article's owning workspace (article -> space -> workspace) and require a match. */
    private void requireArticleInWorkspace(String workspaceId, String articleId) {
        Article article = articles.findById(articleId)
            .orElseThrow(() -> ApiException.notFound("Article", articleId));
        String articleWorkspace = article.getSpaceId() == null ? null
            : spaces.findById(article.getSpaceId()).map(KnowledgeSpace::getWorkspaceId).orElse(null);
        if (articleWorkspace == null || !articleWorkspace.equals(workspaceId)) {
            // Cross-tenant: do not leak existence — treat as not found in this workspace (RB-40 §1).
            throw ApiException.notFound("Article", articleId);
        }
    }

    static String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return ArticleAuthor.CO_AUTHOR;
        }
        String r = role.trim().toUpperCase(java.util.Locale.ROOT);
        if (!ROLES.contains(r)) {
            throw ApiException.badRequest("INVALID_ROLE",
                "Role must be one of AUTHOR, CO_AUTHOR, REVIEWER.", "role");
        }
        return r;
    }
}
