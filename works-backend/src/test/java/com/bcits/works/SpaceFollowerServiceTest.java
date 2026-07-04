package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;

import java.util.List;
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
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for space follow/subscribe (KR-068).
 * Tests: toggle follow → following: true; toggle again → following: false;
 *        publishArticle → SPACE_ARTICLE_PUBLISHED events for each follower;
 *        cross-tenant space → FORBIDDEN before any DB access.
 */
@Tag("unit")
class SpaceFollowerServiceTest {

    private static final String USER = "user-1";
    private static final String SPACE = "KS-X";
    private static final String WORKSPACE = "ws-1";
    private static final String FOREIGN_WS = "ws-B";
    private static final String ARTICLE = "ART-1";

    // ── SpaceFollowerService toggle tests ────────────────────────────────────

    @Test
    void toggle_notFollowing_insertsAndReturnsFollowingTrue() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        EventService events = mock(EventService.class);
        when(jdbc.queryForObject(contains("WHERE user_id = ?"), eq(Integer.class), eq(USER), eq(SPACE)))
                .thenReturn(0);
        when(jdbc.queryForObject(contains("WHERE space_id = ?"), eq(Integer.class), eq(SPACE)))
                .thenReturn(1);

        SpaceFollowerService svc = new SpaceFollowerService(jdbc, events);
        Map<String, Object> result = svc.toggle(USER, SPACE, WORKSPACE);

        assertThat(result.get("following")).isEqualTo(true);
        assertThat(result.get("followerCount")).isEqualTo(1);
        verify(jdbc).update(contains("INSERT INTO space_followers"), eq(USER), eq(SPACE), eq(WORKSPACE), any());
    }

    @Test
    void toggle_alreadyFollowing_deletesAndReturnsFollowingFalse() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        EventService events = mock(EventService.class);
        when(jdbc.queryForObject(contains("WHERE user_id = ?"), eq(Integer.class), eq(USER), eq(SPACE)))
                .thenReturn(1);
        when(jdbc.queryForObject(contains("WHERE space_id = ?"), eq(Integer.class), eq(SPACE)))
                .thenReturn(0);

        SpaceFollowerService svc = new SpaceFollowerService(jdbc, events);
        Map<String, Object> result = svc.toggle(USER, SPACE, WORKSPACE);

        assertThat(result.get("following")).isEqualTo(false);
        assertThat(result.get("followerCount")).isEqualTo(0);
        verify(jdbc).update(contains("DELETE FROM space_followers"), eq(USER), eq(SPACE));
    }

    @Test
    void notifyFollowers_publishArticle_emitsSpaceArticlePublishedForEachFollower() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        EventService events = mock(EventService.class);
        // Two followers; actor is user-1 (should be skipped), follower2 should get the event
        when(jdbc.queryForList(contains("SELECT user_id"), eq(String.class), eq(SPACE)))
                .thenReturn(List.of("user-2", "user-3"));

        SpaceFollowerService svc = new SpaceFollowerService(jdbc, events);
        svc.notifyFollowers(SPACE, WORKSPACE, ARTICLE, USER);

        // user-2 and user-3 are NOT the actor so both get events
        verify(events, times(2)).recordInWorkspace(eq(WORKSPACE), eq(SPACE), eq("SPACE_ARTICLE_PUBLISHED"),
                eq(USER), any());
    }

    @Test
    void notifyFollowers_actorIsFollower_actorSkipped() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        EventService events = mock(EventService.class);
        // Only the actor is a follower — no event should be emitted
        when(jdbc.queryForList(contains("SELECT user_id"), eq(String.class), eq(SPACE)))
                .thenReturn(List.of(USER));

        SpaceFollowerService svc = new SpaceFollowerService(jdbc, events);
        svc.notifyFollowers(SPACE, WORKSPACE, ARTICLE, USER);

        verify(events, never()).recordInWorkspace(any(), any(), any(), any(), any());
    }

    // ── Cross-tenant access via controller ───────────────────────────────────

    @Test
    void toggleFollow_foreignTenant_forbiddenBeforeServiceCall() {
        KnowledgeSpaceRepository spaceRepo = mock(KnowledgeSpaceRepository.class);
        SpaceFollowerService followerSvc = mock(SpaceFollowerService.class);
        AuthenticatedUser auth = mock(AuthenticatedUser.class);
        RbacService rbac = mock(RbacService.class);

        when(auth.id()).thenReturn(USER);
        KnowledgeSpace foreignSpace = new KnowledgeSpace();
        foreignSpace.setId(SPACE);
        foreignSpace.setWorkspaceId(FOREIGN_WS);
        when(spaceRepo.findById(SPACE)).thenReturn(Optional.of(foreignSpace));
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(USER), eq(FOREIGN_WS), anyString());

        SpaceFollowerController controller = new SpaceFollowerController(
                spaceRepo, followerSvc, auth, rbac);

        assertThatThrownBy(() -> controller.toggleFollow(SPACE))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(followerSvc, never()).toggle(any(), any(), any());
    }

    @Test
    void getFollowStatus_foreignTenant_forbiddenBeforeServiceCall() {
        KnowledgeSpaceRepository spaceRepo = mock(KnowledgeSpaceRepository.class);
        SpaceFollowerService followerSvc = mock(SpaceFollowerService.class);
        AuthenticatedUser auth = mock(AuthenticatedUser.class);
        RbacService rbac = mock(RbacService.class);

        when(auth.id()).thenReturn(USER);
        KnowledgeSpace foreignSpace = new KnowledgeSpace();
        foreignSpace.setId(SPACE);
        foreignSpace.setWorkspaceId(FOREIGN_WS);
        when(spaceRepo.findById(SPACE)).thenReturn(Optional.of(foreignSpace));
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(USER), eq(FOREIGN_WS), anyString());

        SpaceFollowerController controller = new SpaceFollowerController(
                spaceRepo, followerSvc, auth, rbac);

        assertThatThrownBy(() -> controller.getFollowStatus(SPACE))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(followerSvc, never()).getStatus(any(), any());
    }
}
