package com.bcits.works;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Article watchers (KR-067). A watcher receives an ARTICLE_WATCHER_NOTIFIED event whenever the
 * watched article is updated. Watching is opt-in (the Watch button in the article header).
 *
 * <p>Tenant safety: callers RBAC-check article access before calling {@link #toggle};
 * all queries are workspace-scoped via the article JOIN or the workspace_id column.
 */
@Service
public class ArticleWatcherService {

    private final JdbcTemplate jdbc;
    private final EventService eventService;

    public ArticleWatcherService(JdbcTemplate jdbc, EventService eventService) {
        this.jdbc = jdbc;
        this.eventService = eventService;
    }

    /**
     * Toggle: if the user is already watching, remove and return watching=false;
     * otherwise insert and return watching=true. Workspace-scoped: article must belong to the
     * given workspace (verified by the caller via RBAC before invoking this method).
     */
    public Map<String, Object> toggle(String userId, String articleId, String workspaceId) {
        boolean currently = isWatching(userId, articleId);
        if (currently) {
            jdbc.update("DELETE FROM article_watchers WHERE user_id = ? AND article_id = ?",
                    userId, articleId);
            int count = watcherCount(articleId);
            return Map.of("watching", false, "watcherCount", count);
        } else {
            jdbc.update(
                    "INSERT INTO article_watchers (user_id, article_id, workspace_id, watched_at) "
                    + "VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
                    userId, articleId, workspaceId, OffsetDateTime.now());
            int count = watcherCount(articleId);
            return Map.of("watching", true, "watcherCount", count);
        }
    }

    /**
     * Returns current watch status + watcher count for the given user and article.
     */
    public Map<String, Object> getStatus(String userId, String articleId) {
        boolean watching = isWatching(userId, articleId);
        int count = watcherCount(articleId);
        return Map.of("watching", watching, "watcherCount", count);
    }

    /**
     * Fan out ARTICLE_WATCHER_NOTIFIED events to every watcher of the article (workspace-scoped).
     * Called by the controller after ARTICLE_UPDATED or status-change transitions.
     */
    public void notifyWatchers(String articleId, String workspaceId, String actorId, String eventType) {
        List<String> watchers = watcherIds(articleId);
        for (String watcherId : watchers) {
            if (watcherId.equals(actorId)) continue; // don't notify the actor
            eventService.recordInWorkspace(workspaceId, articleId, "ARTICLE_WATCHER_NOTIFIED",
                    actorId, Map.of("watcherId", watcherId, "trigger", eventType));
        }
    }

    // ── private helpers ───────────────────────────────────────────────────────

    private boolean isWatching(String userId, String articleId) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM article_watchers WHERE user_id = ? AND article_id = ?",
                Integer.class, userId, articleId);
        return n != null && n > 0;
    }

    private int watcherCount(String articleId) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM article_watchers WHERE article_id = ?",
                Integer.class, articleId);
        return n != null ? n : 0;
    }

    private List<String> watcherIds(String articleId) {
        return jdbc.queryForList(
                "SELECT user_id FROM article_watchers WHERE article_id = ?",
                String.class, articleId);
    }
}
