package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.knowledge.api.Article;
import com.bcits.works.knowledge.ArticleApproval;
import com.bcits.works.knowledge.ArticleApprovalController;
import com.bcits.works.knowledge.ArticleApprovalRepository;
import com.bcits.works.knowledge.api.ArticleRepository;
import com.bcits.works.knowledge.ArticlePublishingService;
import com.bcits.works.knowledge.api.KnowledgeSpace;
import com.bcits.works.knowledge.api.KnowledgeSpaceRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for ArticleApprovalController (KR-019).
 *
 * Covers:
 * 1. Happy-path: submit approval, list approvals.
 * 2. Author cannot approve their own article.
 * 3. Unauthorized: cross-workspace access is blocked.
 */
@Tag("unit")
class ArticleApprovalControllerTest {

    private static final String REVIEWER = "user-reviewer";
    private static final String AUTHOR   = "user-author";
    private static final String WS_A     = "ws-A";
    private static final String WS_B     = "ws-B";
    private static final String ARTICLE_ID = "ART-001";
    private static final String SPACE_ID   = "SPC-001";

    private final ArticleRepository articleRepository         = mock(ArticleRepository.class);
    private final KnowledgeSpaceRepository spaceRepository    = mock(KnowledgeSpaceRepository.class);
    private final ArticleApprovalRepository approvalRepository = mock(ArticleApprovalRepository.class);
    private final ArticlePublishingService articlePublishingService = mock(ArticlePublishingService.class);
    private final RbacService rbac                            = mock(RbacService.class);
    private final AuthenticatedUser authenticatedUser         = mock(AuthenticatedUser.class);

    private ArticleApprovalController controller;

    @BeforeEach
    void setUp() {
        controller = new ArticleApprovalController(
                articleRepository, spaceRepository, approvalRepository,
                articlePublishingService, rbac, authenticatedUser);

        // Article in WS_A
        Article article = new Article();
        article.setId(ARTICLE_ID);
        article.setSpaceId(SPACE_ID);
        article.setAuthorId(AUTHOR);
        article.setStatus("IN_REVIEW");
        when(articleRepository.findById(ARTICLE_ID)).thenReturn(Optional.of(article));

        KnowledgeSpace space = new KnowledgeSpace();
        space.setId(SPACE_ID);
        space.setWorkspaceId(WS_A);
        when(spaceRepository.findById(SPACE_ID)).thenReturn(Optional.of(space));
    }

    // ── Test 1: submit approval (happy path) ────────────────────────────────────

    @Test
    void submitApproval_validDecision_callsServiceAndReturnsApproval() {
        when(authenticatedUser.id()).thenReturn(REVIEWER);
        ArticleApproval expected = new ArticleApproval();
        expected.setId("APR-001");
        expected.setDecision("APPROVED");
        when(articlePublishingService.approveArticle(eq(ARTICLE_ID), eq(REVIEWER), eq(WS_A),
                eq("APPROVED"), any())).thenReturn(expected);

        Map<String, String> body = Map.of("decision", "APPROVED", "comment", "Looks good");
        ArticleApproval result = controller.submitApproval(ARTICLE_ID, body);

        assertThat(result.getDecision()).isEqualTo("APPROVED");
        verify(articlePublishingService).approveArticle(ARTICLE_ID, REVIEWER, WS_A, "APPROVED", "Looks good");
    }

    // ── Test 2: list approvals ───────────────────────────────────────────────────

    @Test
    void listApprovals_memberOfWorkspace_returnsApprovals() {
        when(authenticatedUser.id()).thenReturn(REVIEWER);
        ArticleApproval a1 = new ArticleApproval();
        a1.setId("APR-001");
        a1.setDecision("APPROVED");
        when(approvalRepository.findByArticleIdAndWorkspaceId(ARTICLE_ID, WS_A))
                .thenReturn(List.of(a1));

        List<ArticleApproval> result = controller.listApprovals(ARTICLE_ID);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDecision()).isEqualTo("APPROVED");
    }

    // ── Test 3: author cannot approve own article ────────────────────────────────

    @Test
    void submitApproval_authorApprovesOwnArticle_isForbidden() {
        when(authenticatedUser.id()).thenReturn(AUTHOR);
        doThrow(ApiException.forbidden("An author cannot approve their own article."))
                .when(articlePublishingService).approveArticle(eq(ARTICLE_ID), eq(AUTHOR), eq(WS_A),
                        any(), any());

        assertThatThrownBy(() -> controller.submitApproval(ARTICLE_ID,
                Map.of("decision", "APPROVED")))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("cannot approve their own article");
    }

    // ── Bonus: missing decision field → 400 ─────────────────────────────────────

    @Test
    void submitApproval_missingDecision_throws400() {
        when(authenticatedUser.id()).thenReturn(REVIEWER);
        assertThatThrownBy(() -> controller.submitApproval(ARTICLE_ID, Map.of()))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus().value()).isEqualTo(400));
    }

    // ── Bonus: cross-tenant → 403 ────────────────────────────────────────────────

    @Test
    void listApprovals_crossTenant_forbidden() {
        when(authenticatedUser.id()).thenReturn(REVIEWER);
        doThrow(ApiException.forbidden("No permission"))
                .when(rbac).require(REVIEWER, WS_A, "view_items");

        assertThatThrownBy(() -> controller.listApprovals(ARTICLE_ID))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus().value()).isEqualTo(403));
    }
}
