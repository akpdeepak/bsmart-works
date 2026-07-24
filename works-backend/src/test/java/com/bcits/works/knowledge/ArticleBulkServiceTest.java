package com.bcits.works.knowledge;
import com.bcits.works.knowledge.api.Article;
import com.bcits.works.knowledge.api.ArticleRepository;
import com.bcits.works.knowledge.api.KnowledgeSpace;
import com.bcits.works.knowledge.api.KnowledgeSpaceRepository;

import com.bcits.works.WebhookService;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * KR-038 bulk operations, carved out of {@link ArticleService} into {@link ArticleBulkService}.
 * Governance scenarios (RB-05 Stage 3): happy path · unauthorized · cross-tenant · missing id.
 * These cases moved verbatim from {@code ArticleServiceTest} when the bulk surface was extracted.
 */
@Tag("unit")
class ArticleBulkServiceTest {

    private static final String USER_A = "user-A";
    private static final String WS_A = "ws-A";
    private static final String WS_B = "ws-B";
    private static final String SPACE_A = "SP-A";
    private static final String SPACE_B = "SP-B";
    private static final String ARTICLE_A1 = "ART-A1";
    private static final String ARTICLE_B1 = "ART-B1";
    private static final String MISSING = "ART-MISSING";

    private final ArticleRepository articleRepository = mock(ArticleRepository.class);
    private final KnowledgeSpaceRepository knowledgeSpaceRepository = mock(KnowledgeSpaceRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final RbacGate rbac = mock(RbacGate.class);
    private final WebhookService webhookService = mock(WebhookService.class);
    private final SpaceFollowerService spaceFollowerService = mock(SpaceFollowerService.class);

    private final ArticleBulkService service = new ArticleBulkService(
            articleRepository, knowledgeSpaceRepository, eventService, rbac,
            webhookService, spaceFollowerService);

    @BeforeEach
    void setUp() {
        Article a1 = article(ARTICLE_A1, SPACE_A);
        when(articleRepository.findById(ARTICLE_A1)).thenReturn(Optional.of(a1));
        when(knowledgeSpaceRepository.findById(SPACE_A)).thenReturn(Optional.of(space(SPACE_A, WS_A)));

        Article b1 = article(ARTICLE_B1, SPACE_B);
        when(articleRepository.findById(ARTICLE_B1)).thenReturn(Optional.of(b1));
        when(knowledgeSpaceRepository.findById(SPACE_B)).thenReturn(Optional.of(space(SPACE_B, WS_B)));

        when(articleRepository.findById(MISSING)).thenReturn(Optional.empty());
        when(articleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    // ── bulk archive ──────────────────────────────────────────────────────────

    @Test
    void bulkArchive_happyPath_archivesInTenantArticles() {
        ArticleBulkService.BulkResult result = service.bulkArchive(List.of(ARTICLE_A1), USER_A, WS_A);

        assertThat(result.processed()).containsExactly(ARTICLE_A1);
        assertThat(result.skipped()).isEmpty();
        verify(articleRepository).save(any(Article.class));
    }

    @Test
    void bulkArchive_crossTenantId_isSkippedNotFatal() {
        ArticleBulkService.BulkResult result = service.bulkArchive(List.of(ARTICLE_A1, ARTICLE_B1), USER_A, WS_A);

        assertThat(result.processed()).containsExactly(ARTICLE_A1);
        assertThat(result.skipped()).containsExactly(ARTICLE_B1);
    }

    @Test
    void bulkArchive_missingId_isSkipped() {
        ArticleBulkService.BulkResult result = service.bulkArchive(List.of(MISSING), USER_A, WS_A);

        assertThat(result.processed()).isEmpty();
        assertThat(result.skipped()).containsExactly(MISSING);
        verify(articleRepository, never()).save(any());
    }

    @Test
    void bulkArchive_noEditPermission_throws403() {
        doThrow(ApiException.forbidden("forbidden")).when(rbac).require(USER_A, WS_A, "edit_items");

        assertThrows(ApiException.class, () -> service.bulkArchive(List.of(ARTICLE_A1), USER_A, WS_A));
        verify(articleRepository, never()).save(any());
    }

    // ── bulk delete ───────────────────────────────────────────────────────────

    @Test
    void bulkDelete_happyPath_deletesInTenantArticles() {
        ArticleBulkService.BulkResult result = service.bulkDelete(List.of(ARTICLE_A1), USER_A, WS_A);

        assertThat(result.processed()).containsExactly(ARTICLE_A1);
        assertThat(result.skipped()).isEmpty();
        verify(articleRepository).deleteById(ARTICLE_A1);
    }

    @Test
    void bulkDelete_crossTenantId_isSkippedNotFatal() {
        ArticleBulkService.BulkResult result = service.bulkDelete(List.of(ARTICLE_A1, ARTICLE_B1), USER_A, WS_A);

        assertThat(result.processed()).containsExactly(ARTICLE_A1);
        assertThat(result.skipped()).containsExactly(ARTICLE_B1);
        verify(articleRepository, never()).deleteById(ARTICLE_B1);
    }

    @Test
    void bulkDelete_noDeletePermission_throws403() {
        doThrow(ApiException.forbidden("forbidden")).when(rbac).require(USER_A, WS_A, "delete_items");

        assertThrows(ApiException.class, () -> service.bulkDelete(List.of(ARTICLE_A1), USER_A, WS_A));
        verify(articleRepository, never()).deleteById(any());
    }

    // ── bulk publish ──────────────────────────────────────────────────────────

    @Test
    void bulkPublish_publishesOnlyInReviewInTenantArticles() {
        Article inReview = article(ARTICLE_A1, SPACE_A);
        inReview.setStatus(ArticleWorkflowService.IN_REVIEW);
        when(articleRepository.findById(ARTICLE_A1)).thenReturn(Optional.of(inReview));

        ArticleBulkService.BulkResult result = service.bulkPublish(List.of(ARTICLE_A1), USER_A, WS_A);

        assertThat(result.processed()).containsExactly(ARTICLE_A1);
        verify(eventService).recordInWorkspace(any(), any(), any(), any(), any());
        verify(webhookService).enqueue(any(), any(), any());
        verify(spaceFollowerService).notifyFollowers(any(), any(), any(), any());
    }

    @Test
    void bulkPublish_skipsCrossTenantAndNonReviewArticles() {
        // A1 is PUBLISHED (not IN_REVIEW) -> skipped; B1 is another tenant -> skipped.
        ArticleBulkService.BulkResult result = service.bulkPublish(List.of(ARTICLE_A1, ARTICLE_B1), USER_A, WS_A);

        assertThat(result.processed()).isEmpty();
        assertThat(result.skipped()).containsExactlyInAnyOrder(ARTICLE_A1, ARTICLE_B1);
        verify(articleRepository, never()).save(any());
    }

    @Test
    void bulkPublish_noApprovePermission_throws403() {
        doThrow(ApiException.forbidden("forbidden")).when(rbac).require(USER_A, WS_A, "approve_items");

        assertThrows(ApiException.class, () -> service.bulkPublish(List.of(ARTICLE_A1), USER_A, WS_A));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static Article article(String id, String spaceId) {
        Article a = new Article();
        a.setId(id);
        a.setSpaceId(spaceId);
        a.setStatus("PUBLISHED");
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
