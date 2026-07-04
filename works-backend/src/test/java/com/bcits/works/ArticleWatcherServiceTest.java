package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for article watch/subscribe (KR-067).
 * Tests: toggle watch → watching: true; toggle again → watching: false;
 *        cross-tenant article → FORBIDDEN before any DB access.
 */
@Tag("unit")
class ArticleWatcherServiceTest {

    private static final String USER = "user-1";
    private static final String ARTICLE = "ART-X";
    private static final String WORKSPACE = "ws-1";
    private static final String FOREIGN_WS = "ws-B";

    // ── ArticleWatcherService toggle tests ───────────────────────────────────

    @Test
    void toggle_notWatching_insertsAndReturnsWatchingTrue() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        EventService events = mock(EventService.class);
        // COUNT for isWatching → 0 (not watching)
        when(jdbc.queryForObject(contains("WHERE user_id = ?"), eq(Integer.class), eq(USER), eq(ARTICLE)))
                .thenReturn(0);
        // COUNT for watcherCount → 1 after insert
        when(jdbc.queryForObject(contains("WHERE article_id = ?"), eq(Integer.class), eq(ARTICLE)))
                .thenReturn(1);

        ArticleWatcherService svc = new ArticleWatcherService(jdbc, events);
        Map<String, Object> result = svc.toggle(USER, ARTICLE, WORKSPACE);

        assertThat(result.get("watching")).isEqualTo(true);
        assertThat(result.get("watcherCount")).isEqualTo(1);
        verify(jdbc).update(contains("INSERT INTO article_watchers"), eq(USER), eq(ARTICLE), eq(WORKSPACE), any());
    }

    @Test
    void toggle_alreadyWatching_deletesAndReturnsWatchingFalse() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        EventService events = mock(EventService.class);
        // COUNT for isWatching → 1 (already watching)
        when(jdbc.queryForObject(contains("WHERE user_id = ?"), eq(Integer.class), eq(USER), eq(ARTICLE)))
                .thenReturn(1);
        // COUNT for watcherCount → 0 after delete
        when(jdbc.queryForObject(contains("WHERE article_id = ?"), eq(Integer.class), eq(ARTICLE)))
                .thenReturn(0);

        ArticleWatcherService svc = new ArticleWatcherService(jdbc, events);
        Map<String, Object> result = svc.toggle(USER, ARTICLE, WORKSPACE);

        assertThat(result.get("watching")).isEqualTo(false);
        assertThat(result.get("watcherCount")).isEqualTo(0);
        verify(jdbc).update(contains("DELETE FROM article_watchers"), eq(USER), eq(ARTICLE));
    }

    @Test
    void getStatus_returnsCurrentStateAndCount() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        EventService events = mock(EventService.class);
        when(jdbc.queryForObject(contains("WHERE user_id = ?"), eq(Integer.class), eq(USER), eq(ARTICLE)))
                .thenReturn(1);
        when(jdbc.queryForObject(contains("WHERE article_id = ?"), eq(Integer.class), eq(ARTICLE)))
                .thenReturn(3);

        ArticleWatcherService svc = new ArticleWatcherService(jdbc, events);
        Map<String, Object> result = svc.getStatus(USER, ARTICLE);

        assertThat(result.get("watching")).isEqualTo(true);
        assertThat(result.get("watcherCount")).isEqualTo(3);
    }

    // ── Cross-tenant access via controller ───────────────────────────────────

    @Test
    void toggleWatch_foreignTenant_forbiddenBeforeServiceCall() {
        ArticleRepository articleRepo = mock(ArticleRepository.class);
        KnowledgeSpaceRepository spaceRepo = mock(KnowledgeSpaceRepository.class);
        ArticleWatcherService watcherSvc = mock(ArticleWatcherService.class);
        AuthenticatedUser auth = mock(AuthenticatedUser.class);
        RbacService rbac = mock(RbacService.class);

        when(auth.id()).thenReturn(USER);
        Article foreign = new Article();
        foreign.setId(ARTICLE);
        foreign.setSpaceId("KS-B");
        KnowledgeSpace foreignSpace = new KnowledgeSpace();
        foreignSpace.setId("KS-B");
        foreignSpace.setWorkspaceId(FOREIGN_WS);
        when(articleRepo.findById(ARTICLE)).thenReturn(Optional.of(foreign));
        when(spaceRepo.findById("KS-B")).thenReturn(Optional.of(foreignSpace));
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(USER), eq(FOREIGN_WS), anyString());

        ArticleWatcherController controller = new ArticleWatcherController(
                articleRepo, spaceRepo, watcherSvc, auth, rbac);

        assertThatThrownBy(() -> controller.toggleWatch(ARTICLE))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        // Service must never be called
        verify(watcherSvc, never()).toggle(any(), any(), any());
    }

    @Test
    void getWatchStatus_foreignTenant_forbiddenBeforeServiceCall() {
        ArticleRepository articleRepo = mock(ArticleRepository.class);
        KnowledgeSpaceRepository spaceRepo = mock(KnowledgeSpaceRepository.class);
        ArticleWatcherService watcherSvc = mock(ArticleWatcherService.class);
        AuthenticatedUser auth = mock(AuthenticatedUser.class);
        RbacService rbac = mock(RbacService.class);

        when(auth.id()).thenReturn(USER);
        Article foreign = new Article();
        foreign.setId(ARTICLE);
        foreign.setSpaceId("KS-B");
        KnowledgeSpace foreignSpace = new KnowledgeSpace();
        foreignSpace.setId("KS-B");
        foreignSpace.setWorkspaceId(FOREIGN_WS);
        when(articleRepo.findById(ARTICLE)).thenReturn(Optional.of(foreign));
        when(spaceRepo.findById("KS-B")).thenReturn(Optional.of(foreignSpace));
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(USER), eq(FOREIGN_WS), anyString());

        ArticleWatcherController controller = new ArticleWatcherController(
                articleRepo, spaceRepo, watcherSvc, auth, rbac);

        assertThatThrownBy(() -> controller.getWatchStatus(ARTICLE))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(watcherSvc, never()).getStatus(any(), any());
    }
}
