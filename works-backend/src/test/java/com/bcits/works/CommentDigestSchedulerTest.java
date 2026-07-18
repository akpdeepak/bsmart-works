package com.bcits.works;

import com.bcits.works.shared.EventService;
import com.bcits.works.messaging.CommentDigestScheduler;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Tag("unit")
class CommentDigestSchedulerTest {

    @Mock KnowledgeWorkspaceSettings settings;
    @Mock EventService eventService;
    @Mock JdbcTemplate jdbc;

    CommentDigestScheduler scheduler;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        scheduler = new CommentDigestScheduler(jdbc, settings, eventService);
    }

    @Test
    void offWorkspace_emitsNoEvents() {
        when(settings.getWorkspacesWithFrequency("daily")).thenReturn(List.of());

        scheduler.digest();

        verify(eventService, never()).recordInWorkspace(any(), any(), any(), any(), any());
    }

    @Test
    void dailyWorkspace_withComments_emitsCommentDigestEvent() {
        when(settings.getWorkspacesWithFrequency("daily")).thenReturn(List.of("WS-1"));

        List<Map<String, Object>> rows = List.of(Map.of(
            "article_id",        "ART-1",
            "title",             "Test Article",
            "author_id",         "USER-1",
            "new_comment_count", 2L));

        when(jdbc.queryForList(anyString(), eq("WS-1"), any(OffsetDateTime.class), eq("WS-1")))
            .thenReturn(rows);

        scheduler.digest();

        verify(eventService).recordInWorkspace(
            eq("WS-1"), eq("WS-1"), eq("COMMENT_DIGEST"), eq("system"),
            argThat(payload -> {
                @SuppressWarnings("unchecked")
                Map<String, Object> p = (Map<String, Object>) payload;
                assertThat(p.get("recipientId")).isEqualTo("USER-1");
                assertThat(p.get("workspaceId")).isEqualTo("WS-1");
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> arts = (List<Map<String, Object>>) p.get("articles");
                assertThat(arts).hasSize(1);
                assertThat(arts.get(0).get("id")).isEqualTo("ART-1");
                assertThat(arts.get(0).get("newCommentCount")).isEqualTo(2L);
                return true;
            }));
    }

    @Test
    void dailyWorkspace_noComments_emitsNoEvents() {
        when(settings.getWorkspacesWithFrequency("daily")).thenReturn(List.of("WS-1"));
        when(jdbc.queryForList(anyString(), eq("WS-1"), any(OffsetDateTime.class), eq("WS-1")))
            .thenReturn(List.of());

        scheduler.digest();

        verify(eventService, never()).recordInWorkspace(any(), any(), any(), any(), any());
    }

    @Test
    void multipleArticlesWithSameAuthor_emitsOneEventForAuthor() {
        when(settings.getWorkspacesWithFrequency("daily")).thenReturn(List.of("WS-1"));

        List<Map<String, Object>> rows = List.of(
            Map.of("article_id", "ART-1", "title", "Article One",
                   "author_id", "USER-1", "new_comment_count", 3L),
            Map.of("article_id", "ART-2", "title", "Article Two",
                   "author_id", "USER-1", "new_comment_count", 1L));

        when(jdbc.queryForList(anyString(), eq("WS-1"), any(OffsetDateTime.class), eq("WS-1")))
            .thenReturn(rows);

        scheduler.digest();

        // Both articles belong to the same author → exactly one COMMENT_DIGEST event
        verify(eventService, times(1)).recordInWorkspace(
            eq("WS-1"), eq("WS-1"), eq("COMMENT_DIGEST"), eq("system"), any());
    }

    @Test
    void multipleArticlesWithDifferentAuthors_emitsOneEventPerAuthor() {
        when(settings.getWorkspacesWithFrequency("daily")).thenReturn(List.of("WS-1"));

        List<Map<String, Object>> rows = List.of(
            Map.of("article_id", "ART-1", "title", "Article One",
                   "author_id", "USER-1", "new_comment_count", 2L),
            Map.of("article_id", "ART-2", "title", "Article Two",
                   "author_id", "USER-2", "new_comment_count", 4L));

        when(jdbc.queryForList(anyString(), eq("WS-1"), any(OffsetDateTime.class), eq("WS-1")))
            .thenReturn(rows);

        scheduler.digest();

        verify(eventService, times(2)).recordInWorkspace(
            eq("WS-1"), eq("WS-1"), eq("COMMENT_DIGEST"), eq("system"), any());
    }

    @Test
    void failingWorkspace_doesNotAbortOtherWorkspaces() {
        when(settings.getWorkspacesWithFrequency("daily")).thenReturn(List.of("WS-FAIL", "WS-OK"));

        // First workspace throws; second has one comment
        when(jdbc.queryForList(anyString(), eq("WS-FAIL"), any(OffsetDateTime.class), eq("WS-FAIL")))
            .thenThrow(new RuntimeException("DB error"));
        when(jdbc.queryForList(anyString(), eq("WS-OK"), any(OffsetDateTime.class), eq("WS-OK")))
            .thenReturn(List.of(Map.of(
                "article_id", "ART-1", "title", "Article",
                "author_id", "USER-1", "new_comment_count", 1L)));

        scheduler.digest();

        // WS-OK still produces its event despite WS-FAIL throwing
        verify(eventService, times(1)).recordInWorkspace(
            eq("WS-OK"), eq("WS-OK"), eq("COMMENT_DIGEST"), eq("system"), any());
    }
}
