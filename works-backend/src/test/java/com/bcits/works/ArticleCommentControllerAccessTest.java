package com.bcits.works;

import com.bcits.works.auth.RbacService;
import com.bcits.works.auth.UserRepository;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.knowledge.Article;
import com.bcits.works.knowledge.ArticleComment;
import com.bcits.works.knowledge.ArticleCommentController;
import com.bcits.works.knowledge.ArticleCommentRepository;
import com.bcits.works.knowledge.ArticleRepository;
import com.bcits.works.knowledge.KnowledgeSpace;
import com.bcits.works.knowledge.KnowledgeSpaceRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Proves ArticleCommentController is tenant-scoped (RB-40 §1): reading and posting comments
 * requires access to the article's workspace (a foreign or missing article 404s/403s before any
 * comment row is touched), and a comment can only be resolved/deleted through its own article's
 * path — a commentId from another article is indistinguishable from a missing one.
 */
@Tag("unit")
class ArticleCommentControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String WS_A = "ws-A";
    private static final String WS_B = "ws-B";
    private static final String ARTICLE_IN_A = "ART-001";
    private static final String ARTICLE_IN_B = "ART-666";
    private static final String MISSING_ARTICLE = "ART-404";

    private final ArticleCommentRepository articleCommentRepository = mock(ArticleCommentRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final ArticleRepository articleRepository = mock(ArticleRepository.class);
    private final KnowledgeSpaceRepository knowledgeSpaceRepository = mock(KnowledgeSpaceRepository.class);
    private final RbacService rbac = mock(RbacService.class);

    private final ArticleCommentController controller = new ArticleCommentController(
            articleCommentRepository, userRepository, eventService, authenticatedUser,
            articleRepository, knowledgeSpaceRepository, rbac);

    ArticleCommentControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        // Article in workspace A — caller has access.
        stubArticle(ARTICLE_IN_A, "SP-A", WS_A);
        // Article in workspace B — caller is denied by RBAC.
        stubArticle(ARTICLE_IN_B, "SP-B", WS_B);
        doThrow(ApiException.forbidden("You do not have permission to perform this action."))
                .when(rbac).require(CALLER, WS_B, "view_items");
        when(articleRepository.findById(MISSING_ARTICLE)).thenReturn(Optional.empty());
        when(articleCommentRepository.save(any())).thenAnswer(inv -> {
            ArticleComment c = inv.getArgument(0);
            c.setId(99L);
            return c;
        });
    }

    private void stubArticle(String articleId, String spaceId, String workspaceId) {
        Article article = new Article();
        article.setId(articleId);
        article.setSpaceId(spaceId);
        when(articleRepository.findById(articleId)).thenReturn(Optional.of(article));
        KnowledgeSpace space = new KnowledgeSpace();
        space.setId(spaceId);
        space.setWorkspaceId(workspaceId);
        when(knowledgeSpaceRepository.findById(spaceId)).thenReturn(Optional.of(space));
    }

    private ArticleComment comment(Long id, String articleId) {
        ArticleComment c = new ArticleComment();
        c.setId(id);
        c.setArticleId(articleId);
        c.setAuthorId(CALLER);
        return c;
    }

    // ── Cross-tenant: read and write are gated before any comment row is touched ─

    @Test
    void getComments_crossTenant_deniedAndNeverQueriesComments() {
        assertThrows(ApiException.class, () -> controller.getComments(ARTICLE_IN_B, 0, 50));
        verify(articleCommentRepository, never()).findByArticleIdOrderByCreatedAtAsc(any(), any());
    }

    @Test
    void addComment_crossTenant_deniedAndNeverSaves() {
        ArticleComment incoming = comment(null, null);
        incoming.setBody("should never land");
        assertThrows(ApiException.class, () -> controller.addComment(ARTICLE_IN_B, incoming));
        verify(articleCommentRepository, never()).save(any());
    }

    // ── Unauthorized: a missing article 404s ─────────────────────────────────────

    @Test
    void getComments_unknownArticle_returns404() {
        assertThrows(ApiException.class, () -> controller.getComments(MISSING_ARTICLE, 0, 50));
        verify(articleCommentRepository, never()).findByArticleIdOrderByCreatedAtAsc(any(), any());
    }

    // ── Path binding: a comment from another article cannot be touched ──────────

    @Test
    void toggleResolved_commentFromOtherArticle_returns404AndNeverSaves() {
        when(articleCommentRepository.findById(7L)).thenReturn(Optional.of(comment(7L, ARTICLE_IN_B)));
        assertThrows(ApiException.class, () -> controller.toggleResolved(ARTICLE_IN_A, 7L, null));
        verify(articleCommentRepository, never()).save(any());
    }

    @Test
    void deleteComment_commentFromOtherArticle_returns404AndNeverDeletes() {
        when(articleCommentRepository.findById(7L)).thenReturn(Optional.of(comment(7L, ARTICLE_IN_B)));
        assertThrows(ApiException.class, () -> controller.deleteComment(ARTICLE_IN_A, 7L));
        verify(articleCommentRepository, never()).delete(any(ArticleComment.class));
        verify(articleCommentRepository, never()).deleteById(any());
    }

    // ── Happy path: a member of the article's workspace passes the gate ─────────

    @Test
    void addComment_member_saves() {
        ArticleComment incoming = comment(null, null);
        incoming.setBody("looks good");
        controller.addComment(ARTICLE_IN_A, incoming);
        verify(articleCommentRepository).save(any(ArticleComment.class));
    }

    @Test
    void deleteComment_ownArticle_deletes() {
        when(articleCommentRepository.findById(8L)).thenReturn(Optional.of(comment(8L, ARTICLE_IN_A)));
        controller.deleteComment(ARTICLE_IN_A, 8L);
        verify(articleCommentRepository).delete(any(ArticleComment.class));
    }
}
