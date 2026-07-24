package com.bcits.works.knowledge;

import com.bcits.works.WebhookService;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * KR-019 approval + KR-020 scheduled publish + the status-transition machine, carved out of
 * {@link ArticleService} into {@link ArticlePublishingService}. Governance scenarios (RB-05
 * Stage 3): happy path · unauthorized · cross-tenant · invalid state. The approval case moved
 * verbatim from {@code ArticleServiceTest}; the rest are new coverage for the extracted surface.
 */
@Tag("unit")
class ArticlePublishingServiceTest {

    private static final String USER = "user-A";
    private static final String AUTHOR = "author-1";
    private static final String WS_A = "ws-A";
    private static final String WS_B = "ws-B";
    private static final String SPACE_A = "SP-A";
    private static final String SPACE_B = "SP-B";
    private static final String ART_A = "ART-A1";
    private static final String ART_B = "ART-B1";

    private final ArticleRepository articleRepository = mock(ArticleRepository.class);
    private final ArticleApprovalRepository approvalRepository = mock(ArticleApprovalRepository.class);
    private final KnowledgeSpaceRepository knowledgeSpaceRepository = mock(KnowledgeSpaceRepository.class);
    private final ArticleWorkflowService workflowService = mock(ArticleWorkflowService.class);
    private final EventService eventService = mock(EventService.class);
    private final RbacGate rbac = mock(RbacGate.class);
    private final WebhookService webhookService = mock(WebhookService.class);
    private final SpaceFollowerService spaceFollowerService = mock(SpaceFollowerService.class);
    private final ArticleCommentRepository articleCommentRepository = mock(ArticleCommentRepository.class);
    private final ArticleVersionRepository articleVersionRepository = mock(ArticleVersionRepository.class);
    private final ArticleAnalyticsService analyticsService = mock(ArticleAnalyticsService.class);
    private final ArticleDiffService diffService = mock(ArticleDiffService.class);
    private final ArticleDao articleDao = mock(ArticleDao.class);

    private final ArticleQueryService queryService = new ArticleQueryService(
            articleRepository, articleVersionRepository, articleCommentRepository,
            knowledgeSpaceRepository, analyticsService, diffService, articleDao, eventService, rbac);

    private final ArticlePublishingService service = new ArticlePublishingService(
            articleRepository, approvalRepository, knowledgeSpaceRepository, workflowService,
            eventService, rbac, webhookService, spaceFollowerService, queryService);

    @BeforeEach
    void setUp() {
        when(knowledgeSpaceRepository.findById(SPACE_A)).thenReturn(Optional.of(space(SPACE_A, WS_A)));
        when(knowledgeSpaceRepository.findById(SPACE_B)).thenReturn(Optional.of(space(SPACE_B, WS_B)));
        when(articleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(approvalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        // Caller is a member of WS_A only.
        doThrow(ApiException.forbidden("forbidden")).when(rbac).require(eq(USER), eq(WS_B), any());
    }

    // ── KR-019: approval ──────────────────────────────────────────────────────

    @Test
    void approveArticle_autoPublishesAndEnqueuesWebhook() {
        Article article = article(ART_A, SPACE_A, "IN_REVIEW");
        article.setAuthorId(AUTHOR);
        KnowledgeSpace space = space(SPACE_A, WS_A);
        space.setRequiredApprovals(1);
        when(articleRepository.findById(ART_A)).thenReturn(Optional.of(article));
        when(knowledgeSpaceRepository.findById(SPACE_A)).thenReturn(Optional.of(space));
        when(approvalRepository.countByArticleIdAndWorkspaceIdAndDecision(ART_A, WS_A, "APPROVED"))
                .thenReturn(1);

        service.approveArticle(ART_A, USER, WS_A, "APPROVED", "Looks good");

        assertThat(article.getStatus()).isEqualTo("PUBLISHED");
        verify(eventService).recordInWorkspace(eq(WS_A), eq(ART_A), eq("ARTICLE_PUBLISHED"), eq(USER), any());
        verify(webhookService).enqueue(eq(WS_A), eq("ARTICLE_PUBLISHED"), any());
    }

    @Test
    void approveArticle_authorCannotApproveOwn_throws403() {
        Article article = article(ART_A, SPACE_A, "IN_REVIEW");
        article.setAuthorId(USER);
        when(articleRepository.findById(ART_A)).thenReturn(Optional.of(article));

        assertThatThrownBy(() -> service.approveArticle(ART_A, USER, WS_A, "APPROVED", null))
                .isInstanceOf(ApiException.class);
        verify(approvalRepository, never()).save(any());
    }

    @Test
    void approveArticle_crossTenant_throws404() {
        Article foreign = article(ART_B, SPACE_B, "IN_REVIEW");
        when(articleRepository.findById(ART_B)).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> service.approveArticle(ART_B, USER, WS_A, "APPROVED", null))
                .isInstanceOf(ApiException.class);
        verify(approvalRepository, never()).save(any());
    }

    @Test
    void approveArticle_invalidDecision_throws400() {
        assertThatThrownBy(() -> service.approveArticle(ART_A, USER, WS_A, "MAYBE", null))
                .isInstanceOf(ApiException.class);
    }

    // ── KR-020: schedule publish ──────────────────────────────────────────────

    @Test
    void schedulePublish_futureDateOnDraft_setsScheduled() {
        Article draft = article(ART_A, SPACE_A, "DRAFT");
        when(articleRepository.findById(ART_A)).thenReturn(Optional.of(draft));
        OffsetDateTime future = OffsetDateTime.now().plusDays(1);

        service.schedulePublish(ART_A, USER, WS_A, future);

        assertThat(draft.getStatus()).isEqualTo("SCHEDULED");
        verify(eventService).recordInWorkspace(eq(WS_A), eq(ART_A), eq("ARTICLE_SCHEDULED"), eq(USER), any());
    }

    @Test
    void schedulePublish_pastDate_throws400() {
        assertThatThrownBy(() -> service.schedulePublish(ART_A, USER, WS_A, OffsetDateTime.now().minusDays(1)))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void schedulePublish_publishedArticle_throwsInvalidState() {
        Article published = article(ART_A, SPACE_A, "PUBLISHED");
        when(articleRepository.findById(ART_A)).thenReturn(Optional.of(published));

        assertThatThrownBy(() -> service.schedulePublish(ART_A, USER, WS_A, OffsetDateTime.now().plusDays(1)))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void schedulePublish_crossTenant_throws404() {
        Article foreign = article(ART_B, SPACE_B, "DRAFT");
        when(articleRepository.findById(ART_B)).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> service.schedulePublish(ART_B, USER, WS_A, OffsetDateTime.now().plusDays(1)))
                .isInstanceOf(ApiException.class);
        verify(articleRepository, never()).save(any());
    }

    // ── transition machine ────────────────────────────────────────────────────

    @Test
    void applyTransition_toPublished_notifiesFollowersAndEnqueuesWebhook() {
        Article a = article(ART_A, SPACE_A, "IN_REVIEW");
        when(articleRepository.findById(ART_A)).thenReturn(Optional.of(a));
        when(workflowService.transition("IN_REVIEW", "publish")).thenReturn(ArticleWorkflowService.PUBLISHED);

        service.applyTransition(ART_A, "publish", USER);

        assertThat(a.getStatus()).isEqualTo(ArticleWorkflowService.PUBLISHED);
        verify(spaceFollowerService).notifyFollowers(eq(SPACE_A), eq(WS_A), eq(ART_A), eq(USER));
        verify(webhookService).enqueue(eq(WS_A), eq("ARTICLE_PUBLISHED"), any());
    }

    @Test
    void applyTransition_crossTenant_throws() {
        Article foreign = article(ART_B, SPACE_B, "DRAFT");
        when(articleRepository.findById(ART_B)).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> service.applyTransition(ART_B, "submit", USER))
                .isInstanceOf(ApiException.class);
        verify(articleRepository, never()).save(any());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static Article article(String id, String spaceId, String status) {
        Article a = new Article();
        a.setId(id);
        a.setSpaceId(spaceId);
        a.setStatus(status);
        a.setUpdatedAt(OffsetDateTime.now());
        return a;
    }

    private static KnowledgeSpace space(String id, String workspaceId) {
        KnowledgeSpace s = new KnowledgeSpace();
        s.setId(id);
        s.setWorkspaceId(workspaceId);
        return s;
    }
}
