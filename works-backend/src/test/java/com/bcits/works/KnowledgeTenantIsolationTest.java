package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant / unauthorized access tests for the Knowledge read+write endpoints (RB-40 §1 hard
 * isolation, RB-10 §2 RBAC-in-service). Previously several Article/KnowledgeSpace endpoints read or
 * mutated articles by id with no workspace check — a foreign tenant could enumerate and read (or
 * mutate) another workspace's articles. Each test proves the endpoint is denied at the boundary and
 * that no workspace data is read or mutated across the tenant line. Pure Mockito — no DB/Spring.
 */
@Tag("unit")
class KnowledgeTenantIsolationTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";
    private static final String ARTICLE = "ART-X";
    private static final String SPACE = "KS-X";

    private final ArticleRepository articleRepository = mock(ArticleRepository.class);
    private final ArticleVersionRepository articleVersionRepository = mock(ArticleVersionRepository.class);
    private final ArticleCommentRepository articleCommentRepository = mock(ArticleCommentRepository.class);
    private final ArticleWorkflowService workflowService = mock(ArticleWorkflowService.class);
    private final ArticleAnalyticsService analyticsService = mock(ArticleAnalyticsService.class);
    private final ArticleDiffService diffService = mock(ArticleDiffService.class);
    private final EventService eventService = mock(EventService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final ArticleDao articleDao = mock(ArticleDao.class);
    private final KnowledgeSpaceRepository spaceRepository = mock(KnowledgeSpaceRepository.class);
    private final RbacService rbac = mock(RbacService.class);
    private final ArticleService articleService = mock(ArticleService.class);
    private final ArticleWatcherService articleWatcherService = mock(ArticleWatcherService.class);
    private final SpaceFollowerService spaceFollowerService = mock(SpaceFollowerService.class);
    private final WebhookService webhookService = mock(WebhookService.class);

    private final ArticleController articles = new ArticleController(
        articleRepository, articleVersionRepository, articleCommentRepository, workflowService,
        analyticsService, diffService, eventService, authenticatedUser, articleDao, spaceRepository, rbac,
        articleService, articleWatcherService, spaceFollowerService, webhookService);
    private final KnowledgeSpaceController spaces = new KnowledgeSpaceController(
        spaceRepository, articleRepository, eventService, authenticatedUser, rbac);

    KnowledgeTenantIsolationTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        // A foreign article resolves to a space in a workspace the caller is NOT a member of.
        Article foreign = new Article();
        foreign.setId(ARTICLE);
        foreign.setSpaceId(SPACE);
        KnowledgeSpace foreignSpace = new KnowledgeSpace();
        foreignSpace.setId(SPACE);
        foreignSpace.setWorkspaceId(FOREIGN_WS);
        when(articleRepository.findById(ARTICLE)).thenReturn(Optional.of(foreign));
        when(spaceRepository.findById(SPACE)).thenReturn(Optional.of(foreignSpace));
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), anyString());
    }

    private static void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call)
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void getVersions_deniedForForeignTenant_noRead() {
        assertForbidden(() -> articles.getVersions(ARTICLE, 0, 50));
        verifyNoInteractions(articleVersionRepository);
    }

    @Test
    void diffVersions_deniedForForeignTenant_noRead() {
        assertForbidden(() -> articles.diffVersions(ARTICLE, 1, 2));
        verifyNoInteractions(articleVersionRepository, diffService);
    }

    @Test
    void restoreVersion_deniedForForeignTenant_noMutation() {
        assertForbidden(() -> articles.restoreVersion(ARTICLE, 1));
        verify(articleRepository, never()).save(any());
        verifyNoInteractions(eventService);
    }

    @Test
    void getArticleLinks_deniedForForeignTenant_noRead() {
        assertForbidden(() -> articles.getArticleLinks(ARTICLE));
        verifyNoInteractions(articleDao);
    }

    @Test
    void getAnalytics_deniedForForeignTenant_noRead() {
        assertForbidden(() -> articles.getAnalytics(ARTICLE));
        verifyNoInteractions(articleDao, articleCommentRepository);
    }

    @Test
    void voteHelpful_deniedForForeignTenant_noMutation() {
        assertForbidden(() -> articles.voteHelpful(ARTICLE));
        verifyNoInteractions(articleDao);
    }

    @Test
    void linkWorkItem_deniedForForeignTenant_noMutation() {
        assertForbidden(() -> articles.linkWorkItem(ARTICLE, Map.of("workItemId", "WRK-1")));
        verifyNoInteractions(articleDao);
    }

    @Test
    void unlinkWorkItem_deniedForForeignTenant_noMutation() {
        assertForbidden(() -> articles.unlinkWorkItem(ARTICLE, "WRK-1"));
        verifyNoInteractions(articleDao);
    }

    @Test
    void createArticle_inForeignSpace_denied_noSave() {
        Article body = new Article();
        body.setSpaceId(SPACE);
        body.setTitle("Sneak");
        assertForbidden(() -> articles.createArticle(body));
        verify(articleRepository, never()).save(any());
    }

    @Test
    void getSpaces_isWorkspaceScoped_neverListsAllTenants() {
        when(spaceRepository.findAllScopedToUser(eq(CALLER), any())).thenReturn(Page.empty());
        spaces.getSpaces(0, 50);
        verify(spaceRepository).findAllScopedToUser(eq(CALLER), any());
        verify(spaceRepository, never()).findAllByOrderByNameAsc(any(Pageable.class));
    }

    @Test
    void getSpaceArticles_deniedForForeignTenant_noRead() {
        assertForbidden(() -> spaces.getSpaceArticles(SPACE, null, 0, 50));
        verify(articleRepository, never()).findBySpaceIdOrderByUpdatedAtDesc(anyString(), any());
    }
}
