package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.knowledge.Article;
import com.bcits.works.knowledge.ArticleAnalyticsService;
import com.bcits.works.knowledge.ArticleApprovalRepository;
import com.bcits.works.knowledge.ArticleCommentRepository;
import com.bcits.works.knowledge.ArticleDao;
import com.bcits.works.knowledge.ArticleDiffService;
import com.bcits.works.knowledge.ArticleQueryService;
import com.bcits.works.knowledge.ArticleRepository;
import com.bcits.works.knowledge.ArticleService;
import com.bcits.works.knowledge.ArticleVersion;
import com.bcits.works.knowledge.ArticleVersionRepository;
import com.bcits.works.knowledge.ArticleWorkflowService;
import com.bcits.works.knowledge.KnowledgeSpace;
import com.bcits.works.knowledge.KnowledgeSpaceRepository;
import com.bcits.works.knowledge.SpaceFollowerService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link ArticleService} covering KR-022 (duplicate) and KR-038 (bulk operations).
 * Mandatory governance scenarios (RB-05 Stage 3): happy path · unauthorized · cross-tenant.
 */
@Tag("unit")
class ArticleServiceTest {

    private static final String USER_A = "user-A";
    private static final String WS_A = "ws-A";
    private static final String WS_B = "ws-B";
    private static final String SPACE_A = "SP-A";
    private static final String SPACE_B = "SP-B";
    private static final String ARTICLE_A1 = "ART-A1";
    private static final String ARTICLE_B1 = "ART-B1";
    private static final String MISSING = "ART-MISSING";

    private final ArticleRepository articleRepository = mock(ArticleRepository.class);
    private final ArticleVersionRepository articleVersionRepository = mock(ArticleVersionRepository.class);
    private final ArticleCommentRepository articleCommentRepository = mock(ArticleCommentRepository.class);
    private final KnowledgeSpaceRepository knowledgeSpaceRepository = mock(KnowledgeSpaceRepository.class);
    private final ArticleApprovalRepository approvalRepository = mock(ArticleApprovalRepository.class);
    private final ArticleWorkflowService workflowService = mock(ArticleWorkflowService.class);
    private final ArticleAnalyticsService analyticsService = mock(ArticleAnalyticsService.class);
    private final ArticleDiffService diffService = mock(ArticleDiffService.class);
    private final ArticleDao articleDao = mock(ArticleDao.class);
    private final EventService eventService = mock(EventService.class);
    private final RbacService rbac = mock(RbacService.class);
    private final WebhookService webhookService = mock(WebhookService.class);
    private final SpaceFollowerService spaceFollowerService = mock(SpaceFollowerService.class);

    // The read side and the by-id tenant/RBAC choke points now live in ArticleQueryService; the
    // command service delegates its loads there, so the test wires a real one over the same mocks.
    private final ArticleQueryService queryService = new ArticleQueryService(
            articleRepository, articleVersionRepository, articleCommentRepository,
            knowledgeSpaceRepository, analyticsService, diffService, articleDao, eventService, rbac);

    private final ArticleService service = new ArticleService(
            articleRepository, articleVersionRepository,
            knowledgeSpaceRepository, approvalRepository, workflowService,
            articleDao, eventService, rbac,
            webhookService, spaceFollowerService, queryService);

    @BeforeEach
    void setUp() {
        // Article A1 — belongs to workspace A
        Article a1 = article(ARTICLE_A1, SPACE_A, "Runbook Alpha");
        when(articleRepository.findById(ARTICLE_A1)).thenReturn(Optional.of(a1));
        KnowledgeSpace spaceA = space(SPACE_A, WS_A);
        when(knowledgeSpaceRepository.findById(SPACE_A)).thenReturn(Optional.of(spaceA));

        // Article B1 — belongs to workspace B (cross-tenant tripwire)
        Article b1 = article(ARTICLE_B1, SPACE_B, "Secret doc");
        when(articleRepository.findById(ARTICLE_B1)).thenReturn(Optional.of(b1));
        KnowledgeSpace spaceB = space(SPACE_B, WS_B);
        when(knowledgeSpaceRepository.findById(SPACE_B)).thenReturn(Optional.of(spaceB));

        // Missing article
        when(articleRepository.findById(MISSING)).thenReturn(Optional.empty());

        // save passthrough
        when(articleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(articleVersionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // RBAC: deny everything on WS_B
        doThrow(ApiException.forbidden("forbidden"))
                .when(rbac).require(USER_A, WS_B, "create_items");
        doThrow(ApiException.forbidden("forbidden"))
                .when(rbac).require(USER_A, WS_B, "edit_items");
        doThrow(ApiException.forbidden("forbidden"))
                .when(rbac).require(USER_A, WS_B, "delete_items");
    }

    // ── KR-022: duplicate ─────────────────────────────────────────────────────

    @Test
    void duplicate_happyPath_createsCopyWithSuffix() {
        Article copy = service.duplicate(ARTICLE_A1, USER_A, WS_A);

        assertThat(copy.getTitle()).isEqualTo("Runbook Alpha (copy)");
        assertThat(copy.getStatus()).isEqualTo("DRAFT");
        assertThat(copy.getVersionNumber()).isEqualTo(1);
        assertThat(copy.getSpaceId()).isEqualTo(SPACE_A);
        assertThat(copy.getId()).isNotEqualTo(ARTICLE_A1);
        verify(articleRepository).save(any(Article.class));
        verify(articleVersionRepository).save(any(ArticleVersion.class));
    }

    @Test
    void duplicate_crossTenant_throws404() {
        // Caller is in WS_A — trying to duplicate an article from WS_B must throw NOT_FOUND
        // (we never reveal the article exists in another workspace)
        assertThrows(ApiException.class,
                () -> service.duplicate(ARTICLE_B1, USER_A, WS_A));
        verify(articleRepository, never()).save(any());
    }

    @Test
    void duplicate_missingArticle_throws404() {
        assertThrows(ApiException.class,
                () -> service.duplicate(MISSING, USER_A, WS_A));
        verify(articleRepository, never()).save(any());
    }

    @Test
    void duplicate_noCreatePermission_throws403() {
        // RBAC denies create_items in WS_A for a different setup — simulate via doThrow
        doThrow(ApiException.forbidden("forbidden"))
                .when(rbac).require(USER_A, WS_A, "create_items");

        assertThrows(ApiException.class,
                () -> service.duplicate(ARTICLE_A1, USER_A, WS_A));
        verify(articleRepository, never()).save(any());
    }

    // ── KR-038: bulk archive ──────────────────────────────────────────────────

    @Test
    void bulkArchive_happyPath_archivesInTenantArticles() {
        ArticleService.BulkResult result =
                service.bulkArchive(List.of(ARTICLE_A1), USER_A, WS_A);

        assertThat(result.processed()).containsExactly(ARTICLE_A1);
        assertThat(result.skipped()).isEmpty();
        verify(articleRepository).save(any(Article.class));
    }

    @Test
    void bulkArchive_crossTenantId_isSkippedNotFatal() {
        ArticleService.BulkResult result =
                service.bulkArchive(List.of(ARTICLE_A1, ARTICLE_B1), USER_A, WS_A);

        assertThat(result.processed()).containsExactly(ARTICLE_A1);
        assertThat(result.skipped()).containsExactly(ARTICLE_B1);
    }

    @Test
    void bulkArchive_missingId_isSkipped() {
        ArticleService.BulkResult result =
                service.bulkArchive(List.of(MISSING), USER_A, WS_A);

        assertThat(result.processed()).isEmpty();
        assertThat(result.skipped()).containsExactly(MISSING);
        verify(articleRepository, never()).save(any());
    }

    @Test
    void bulkArchive_noEditPermission_throws403() {
        doThrow(ApiException.forbidden("forbidden"))
                .when(rbac).require(USER_A, WS_A, "edit_items");

        assertThrows(ApiException.class,
                () -> service.bulkArchive(List.of(ARTICLE_A1), USER_A, WS_A));
        verify(articleRepository, never()).save(any());
    }

    // ── KR-038: bulk delete ───────────────────────────────────────────────────

    @Test
    void bulkDelete_happyPath_deletesInTenantArticles() {
        ArticleService.BulkResult result =
                service.bulkDelete(List.of(ARTICLE_A1), USER_A, WS_A);

        assertThat(result.processed()).containsExactly(ARTICLE_A1);
        assertThat(result.skipped()).isEmpty();
        verify(articleRepository).deleteById(ARTICLE_A1);
    }

    @Test
    void bulkDelete_crossTenantId_isSkippedNotFatal() {
        ArticleService.BulkResult result =
                service.bulkDelete(List.of(ARTICLE_A1, ARTICLE_B1), USER_A, WS_A);

        assertThat(result.processed()).containsExactly(ARTICLE_A1);
        assertThat(result.skipped()).containsExactly(ARTICLE_B1);
        verify(articleRepository, never()).deleteById(ARTICLE_B1);
    }

    @Test
    void bulkDelete_noDeletePermission_throws403() {
        doThrow(ApiException.forbidden("forbidden"))
                .when(rbac).require(USER_A, WS_A, "delete_items");

        assertThrows(ApiException.class,
                () -> service.bulkDelete(List.of(ARTICLE_A1), USER_A, WS_A));
        verify(articleRepository, never()).deleteById(any());
    }

    @Test
    void approveArticle_autoPublishesAndEnqueuesWebhook() {
        Article article = article(ARTICLE_A1, SPACE_A, "Release notes");
        article.setStatus("IN_REVIEW");
        article.setAuthorId("author-1");
        KnowledgeSpace space = space(SPACE_A, WS_A);
        space.setRequiredApprovals(1);
        when(articleRepository.findById(ARTICLE_A1)).thenReturn(Optional.of(article));
        when(knowledgeSpaceRepository.findById(SPACE_A)).thenReturn(Optional.of(space));
        when(approvalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(approvalRepository.countByArticleIdAndWorkspaceIdAndDecision(ARTICLE_A1, WS_A, "APPROVED"))
                .thenReturn(1);

        service.approveArticle(ARTICLE_A1, USER_A, WS_A, "APPROVED", "Looks good");

        assertThat(article.getStatus()).isEqualTo("PUBLISHED");
        verify(eventService).recordInWorkspace(eq(WS_A), eq(ARTICLE_A1),
                eq("ARTICLE_PUBLISHED"), eq(USER_A), any());
        verify(webhookService).enqueue(eq(WS_A), eq("ARTICLE_PUBLISHED"), any());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static Article article(String id, String spaceId, String title) {
        Article a = new Article();
        a.setId(id);
        a.setSpaceId(spaceId);
        a.setTitle(title);
        a.setStatus("PUBLISHED");
        a.setVersionNumber(3);
        a.setContentFormat("markdown");
        a.setContent("Some content");
        a.setHelpfulVotes(0);
        a.setViewCount(0);
        a.setCreatedAt(OffsetDateTime.now());
        a.setUpdatedAt(OffsetDateTime.now());
        return a;
    }

    private static KnowledgeSpace space(String id, String workspaceId) {
        KnowledgeSpace ks = new KnowledgeSpace();
        ks.setId(id);
        ks.setWorkspaceId(workspaceId);
        return ks;
    }
}
