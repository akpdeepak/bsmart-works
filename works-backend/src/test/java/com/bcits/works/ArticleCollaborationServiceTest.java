package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.knowledge.Article;
import com.bcits.works.knowledge.ArticleAuthorRepository;
import com.bcits.works.knowledge.ArticleCollaborationService;
import com.bcits.works.knowledge.ArticleRepository;
import com.bcits.works.knowledge.KnowledgeSpace;
import com.bcits.works.knowledge.KnowledgeSpaceRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant isolation tests for ArticleCollaborationService (iteration 20, Cap I —
 * RB-05 Stage 3, RB-40 §1). An article owned by WS-B must be invisible to callers
 * presenting WS-A, regardless of whether the article exists in the DB.
 */
@Tag("unit")
class ArticleCollaborationServiceTest {

    private static final String WS_A = "ws-alpha";
    private static final String WS_B = "ws-beta";
    private static final String ARTICLE_ID = "ART-001";
    private static final String SPACE_B_ID = "SPC-B";

    private final ArticleAuthorRepository authors = mock(ArticleAuthorRepository.class);
    private final ArticleRepository articles = mock(ArticleRepository.class);
    private final KnowledgeSpaceRepository spaces = mock(KnowledgeSpaceRepository.class);
    private final EventService events = mock(EventService.class);

    private final ArticleCollaborationService service =
        new ArticleCollaborationService(authors, articles, spaces, events);

    /** Returns an article whose owning space belongs to WS-B. */
    private void articleBelongsToWsB() {
        Article article = new Article();
        article.setId(ARTICLE_ID);
        article.setSpaceId(SPACE_B_ID);
        when(articles.findById(ARTICLE_ID)).thenReturn(Optional.of(article));

        KnowledgeSpace space = new KnowledgeSpace();
        space.setId(SPACE_B_ID);
        space.setWorkspaceId(WS_B);
        when(spaces.findById(SPACE_B_ID)).thenReturn(Optional.of(space));
    }

    @Test
    void listAuthors_rejectsForeignWorkspaceArticle() {
        articleBelongsToWsB();

        // WS-A caller must not see WS-B's article roster.
        assertThatThrownBy(() -> service.listAuthors(WS_A, ARTICLE_ID))
            .isInstanceOf(ApiException.class);
        verify(authors, never()).findByWorkspaceIdAndArticleIdOrderByAddedAtAsc(anyString(), anyString());
    }

    @Test
    void addAuthor_rejectsForeignWorkspaceArticle() {
        articleBelongsToWsB();

        assertThatThrownBy(() -> service.addAuthor(WS_A, "user-A", ARTICLE_ID, "user-C", "CO_AUTHOR"))
            .isInstanceOf(ApiException.class);
        verify(authors, never()).save(any());
        verify(events, never()).recordInWorkspace(any(), any(), any(), any(), any());
    }

    @Test
    void removeAuthor_rejectsForeignWorkspaceArticle() {
        articleBelongsToWsB();

        assertThatThrownBy(() -> service.removeAuthor(WS_A, "user-A", ARTICLE_ID, "user-C"))
            .isInstanceOf(ApiException.class);
        verify(authors, never()).delete(any());
        verify(events, never()).recordInWorkspace(any(), any(), any(), any(), any());
    }
}
