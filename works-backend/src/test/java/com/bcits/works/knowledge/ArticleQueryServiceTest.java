package com.bcits.works.knowledge;
import com.bcits.works.knowledge.api.Article;
import com.bcits.works.knowledge.api.ArticleRepository;
import com.bcits.works.knowledge.api.KnowledgeSpace;
import com.bcits.works.knowledge.api.KnowledgeSpaceRepository;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
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
 * Characterization coverage for {@link ArticleQueryService}, the read side carved out of
 * {@link ArticleService}. Pins the behaviour that moved verbatim — most importantly that every
 * by-id read runs through the tenant/RBAC choke point (RB-40 §1) and that a cross-tenant read is
 * refused before any data is returned.
 */
@Tag("unit")
class ArticleQueryServiceTest {

    private static final String USER = "user-A";
    private static final String WS_A = "ws-A";
    private static final String WS_B = "ws-B";
    private static final String SPACE_A = "SP-A";
    private static final String SPACE_B = "SP-B";
    private static final String ART_A = "ART-A1";
    private static final String ART_B = "ART-B1";

    private final ArticleRepository articleRepository = mock(ArticleRepository.class);
    private final ArticleVersionRepository articleVersionRepository = mock(ArticleVersionRepository.class);
    private final ArticleCommentRepository articleCommentRepository = mock(ArticleCommentRepository.class);
    private final KnowledgeSpaceRepository knowledgeSpaceRepository = mock(KnowledgeSpaceRepository.class);
    private final ArticleAnalyticsService analyticsService = mock(ArticleAnalyticsService.class);
    private final ArticleDiffService diffService = mock(ArticleDiffService.class);
    private final ArticleDao articleDao = mock(ArticleDao.class);
    private final EventService eventService = mock(EventService.class);
    private final RbacGate rbac = mock(RbacGate.class);

    private final ArticleQueryService query = new ArticleQueryService(
            articleRepository, articleVersionRepository, articleCommentRepository,
            knowledgeSpaceRepository, analyticsService, diffService, articleDao, eventService, rbac);

    @BeforeEach
    void setUp() {
        Article a = new Article();
        a.setId(ART_A);
        a.setSpaceId(SPACE_A);
        a.setViewCount(4);
        when(articleRepository.findById(ART_A)).thenReturn(Optional.of(a));
        KnowledgeSpace spaceA = new KnowledgeSpace();
        spaceA.setId(SPACE_A);
        spaceA.setWorkspaceId(WS_A);
        when(knowledgeSpaceRepository.findById(SPACE_A)).thenReturn(Optional.of(spaceA));

        Article b = new Article();
        b.setId(ART_B);
        b.setSpaceId(SPACE_B);
        when(articleRepository.findById(ART_B)).thenReturn(Optional.of(b));
        KnowledgeSpace spaceB = new KnowledgeSpace();
        spaceB.setId(SPACE_B);
        spaceB.setWorkspaceId(WS_B);
        when(knowledgeSpaceRepository.findById(SPACE_B)).thenReturn(Optional.of(spaceB));

        // The caller is a member of WS_A only — reads against WS_B are refused (RB-40 §1).
        doThrow(ApiException.forbidden("forbidden")).when(rbac).require(USER, WS_B, "view_items");
    }

    @Test
    void getForRead_checksAccessAndIncrementsViewCount() {
        Article result = query.getForRead(ART_A, USER);

        verify(rbac).require(USER, WS_A, "view_items");
        verify(articleDao).incrementViewCount(ART_A);
        assertThat(result.getViewCount()).isEqualTo(5);
    }

    @Test
    void getForRead_crossTenant_isRefusedAndDoesNotIncrement() {
        assertThatThrownBy(() -> query.getForRead(ART_B, USER))
                .isInstanceOf(ApiException.class);
        verify(articleDao, never()).incrementViewCount(any());
    }

    @Test
    void getChildren_crossTenant_isRefused() {
        assertThatThrownBy(() -> query.getChildren(ART_B, USER))
                .isInstanceOf(ApiException.class);
        verify(articleRepository, never()).findByParentIdOrderByUpdatedAtDesc(any());
    }

    @Test
    void getActivity_checksAccessBeforeReturningEvents() {
        when(eventService.eventsFor(ART_A)).thenReturn(List.of());

        query.getActivity(ART_A, USER);

        verify(rbac).require(USER, WS_A, "view_items");
        verify(eventService).eventsFor(ART_A);
    }

    @Test
    void getActivity_crossTenant_isRefusedBeforeReadingEvents() {
        assertThatThrownBy(() -> query.getActivity(ART_B, USER))
                .isInstanceOf(ApiException.class);
        verify(eventService, never()).eventsFor(any());
    }

    @Test
    void requireArticleById_missing_throwsNotFound() {
        when(articleRepository.findById("ART-MISSING")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> query.requireArticleById("ART-MISSING", USER))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void list_withSearchTerm_recordsTheTermAndUsesTheTitleQuery() {
        when(analyticsService.normalizeSearchTerm("runbook")).thenReturn("runbook");
        when(articleRepository.findByTitleScopedToUser(eq("runbook"), eq(USER), any()))
                .thenReturn(org.springframework.data.domain.Page.empty());

        query.list(null, "runbook", null, 0, 50, USER);

        verify(articleDao).recordSearchTerm("runbook");
        verify(articleRepository).findByTitleScopedToUser(eq("runbook"), eq(USER), any());
    }

    @Test
    void list_withoutSearch_usesTheScopedListQuery() {
        when(articleRepository.findAllScopedToUser(eq(USER), any()))
                .thenReturn(org.springframework.data.domain.Page.empty());

        query.list(null, null, null, 0, 50, USER);

        verify(articleRepository).findAllScopedToUser(eq(USER), any());
        verify(articleDao, never()).recordSearchTerm(any());
    }
}
