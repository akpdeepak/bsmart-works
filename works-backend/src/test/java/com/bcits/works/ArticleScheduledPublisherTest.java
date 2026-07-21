package com.bcits.works;

import com.bcits.works.shared.EventService;
import com.bcits.works.knowledge.Article;
import com.bcits.works.knowledge.ArticleRepository;
import com.bcits.works.knowledge.ArticleScheduledPublisher;
import com.bcits.works.knowledge.KnowledgeSpace;
import com.bcits.works.knowledge.KnowledgeSpaceRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for ArticleScheduledPublisher (KR-020).
 *
 * 1. An article with scheduledPublishAt <= NOW transitions to PUBLISHED and emits an event.
 * 2. An article with scheduledPublishAt in the future is not touched.
 */
@Tag("unit")
class ArticleScheduledPublisherTest {

    private final ArticleRepository articleRepository         = mock(ArticleRepository.class);
    private final KnowledgeSpaceRepository spaceRepository    = mock(KnowledgeSpaceRepository.class);
    private final EventService eventService                   = mock(EventService.class);
    private final WebhookService webhookService               = mock(WebhookService.class);

    private final ArticleScheduledPublisher publisher =
            new ArticleScheduledPublisher(articleRepository, spaceRepository, eventService, webhookService);

    // ── Test 1: due article gets published ──────────────────────────────────────

    @Test
    void publishDue_scheduledTimeElapsed_articlePublished() {
        OffsetDateTime past = OffsetDateTime.now().minusMinutes(5);
        Article article = scheduledArticle("ART-001", "SPC-001", past);

        KnowledgeSpace space = new KnowledgeSpace();
        space.setWorkspaceId("WS-001");
        when(spaceRepository.findById("SPC-001")).thenReturn(Optional.of(space));
        when(articleRepository.findByStatusAndScheduledPublishAtBefore(eq("SCHEDULED"), any()))
                .thenReturn(List.of(article));
        when(articleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        publisher.publishDue();

        verify(articleRepository).save(any(Article.class));
        assertThat(article.getStatus()).isEqualTo("PUBLISHED");
        assertThat(article.getPublishedAt()).isNotNull();
        verify(eventService).recordInWorkspace(eq("WS-001"), eq("ART-001"),
                eq("ARTICLE_PUBLISHED"), eq("system"), any());
        verify(webhookService).enqueue(eq("WS-001"), eq("ARTICLE_PUBLISHED"), any());
    }

    // ── Test 2: future article is untouched ─────────────────────────────────────

    @Test
    void publishDue_scheduledTimeInFuture_articleNotTouched() {
        // Repository returns nothing due yet — simulates future-only articles
        when(articleRepository.findByStatusAndScheduledPublishAtBefore(eq("SCHEDULED"), any()))
                .thenReturn(Collections.emptyList());

        publisher.publishDue();

        verify(articleRepository, never()).save(any());
        verify(eventService, never()).recordInWorkspace(any(), any(), any(), any(), any());
        verify(webhookService, never()).enqueue(any(), any(), any());
    }

    private Article scheduledArticle(String id, String spaceId, OffsetDateTime scheduledAt) {
        Article a = new Article();
        a.setId(id);
        a.setSpaceId(spaceId);
        a.setStatus("SCHEDULED");
        a.setScheduledPublishAt(scheduledAt);
        return a;
    }
}
