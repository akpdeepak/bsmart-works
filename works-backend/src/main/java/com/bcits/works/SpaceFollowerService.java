package com.bcits.works;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Space followers (KR-068). A follower receives a SPACE_ARTICLE_PUBLISHED event whenever
 * a new article is published in a space they follow. Following is opt-in (the Follow button).
 *
 * <p>Tenant safety: callers RBAC-check space access before calling {@link #toggle};
 * all queries are workspace-scoped via the workspace_id column.
 */
@Service
public class SpaceFollowerService {

    private final JdbcTemplate jdbc;
    private final EventService eventService;

    public SpaceFollowerService(JdbcTemplate jdbc, EventService eventService) {
        this.jdbc = jdbc;
        this.eventService = eventService;
    }

    /**
     * Toggle: if the user is already following, remove and return following=false;
     * otherwise insert and return following=true.
     */
    public Map<String, Object> toggle(String userId, String spaceId, String workspaceId) {
        boolean currently = isFollowing(userId, spaceId);
        if (currently) {
            jdbc.update("DELETE FROM space_followers WHERE user_id = ? AND space_id = ?",
                    userId, spaceId);
            int count = followerCount(spaceId);
            return Map.of("following", false, "followerCount", count);
        } else {
            jdbc.update(
                    "INSERT INTO space_followers (user_id, space_id, workspace_id, followed_at) "
                    + "VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
                    userId, spaceId, workspaceId, OffsetDateTime.now());
            int count = followerCount(spaceId);
            return Map.of("following", true, "followerCount", count);
        }
    }

    /**
     * Returns { following, followerCount } for the given user and space.
     */
    public Map<String, Object> getStatus(String userId, String spaceId) {
        boolean following = isFollowing(userId, spaceId);
        int count = followerCount(spaceId);
        return Map.of("following", following, "followerCount", count);
    }

    /**
     * Fan out SPACE_ARTICLE_PUBLISHED events to every follower of the space when an article is
     * published. Called by the controller's publish action (workspace-scoped).
     */
    public void notifyFollowers(String spaceId, String workspaceId, String articleId,
                                 String actorId) {
        List<String> followers = followerIds(spaceId);
        for (String followerId : followers) {
            if (followerId.equals(actorId)) continue; // don't notify the actor
            eventService.recordInWorkspace(workspaceId, spaceId, "SPACE_ARTICLE_PUBLISHED",
                    actorId, Map.of("followerId", followerId, "articleId", articleId));
        }
    }

    // ── private helpers ───────────────────────────────────────────────────────

    private boolean isFollowing(String userId, String spaceId) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM space_followers WHERE user_id = ? AND space_id = ?",
                Integer.class, userId, spaceId);
        return n != null && n > 0;
    }

    private int followerCount(String spaceId) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM space_followers WHERE space_id = ?",
                Integer.class, spaceId);
        return n != null ? n : 0;
    }

    private List<String> followerIds(String spaceId) {
        return jdbc.queryForList(
                "SELECT user_id FROM space_followers WHERE space_id = ?",
                String.class, spaceId);
    }
}
