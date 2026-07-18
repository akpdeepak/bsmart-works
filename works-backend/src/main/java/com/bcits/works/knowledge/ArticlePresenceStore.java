package com.bcits.works.knowledge;

import com.bcits.works.RealtimeService;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store for per-article presence records (KR-065 — real-time presence indicators).
 *
 * <p>Architecture: a two-level {@link ConcurrentHashMap} keyed by {@code articleId} then
 * {@code userId}. Entries are evicted by the scheduled cleanup when they have not received a
 * heartbeat for more than {@value #TTL_SECONDS} seconds. Broadcast to SSE clients is delegated to
 * {@link RealtimeService} so the presence event reaches every open client in the article's
 * workspace (tenant isolation: the publish only touches the correct workspace bucket — RB-40 §1).
 *
 * <p>All public methods are thread-safe.
 */
@Component
public class ArticlePresenceStore {

    /** Seconds after which a presence record without a fresh heartbeat is evicted. */
    static final long TTL_SECONDS = 30;

    /** Per-viewer record stored in the map. */
    public record PresenceRecord(String userId, String displayName, String avatarInitial,
                                 Double cursorX, Double cursorY, Instant lastSeen) { }

    // articleId → userId → PresenceRecord
    private final Map<String, ConcurrentHashMap<String, PresenceRecord>> byArticle =
            new ConcurrentHashMap<>();

    private final RealtimeService realtime;

    public ArticlePresenceStore(RealtimeService realtime) {
        this.realtime = realtime;
    }

    /**
     * Upsert a viewer presence record and broadcast {@code PRESENCE_UPDATE} to all SSE clients
     * subscribed to the given workspace.
     *
     * @param articleId    the article being viewed
     * @param workspaceId  the workspace that owns the article (used for SSE fan-out)
     * @param record       the viewer's presence data
     * @return the current presence list for the article (after upsert)
     */
    public List<PresenceRecord> upsert(String articleId, String workspaceId, PresenceRecord record) {
        byArticle.computeIfAbsent(articleId, k -> new ConcurrentHashMap<>())
                 .put(record.userId(), record);
        List<PresenceRecord> presences = getPresences(articleId);
        realtime.publish(workspaceId, "PRESENCE_UPDATE",
                Map.of("articleId", articleId, "presences", presences));
        return presences;
    }

    /**
     * Remove a viewer and broadcast the updated list.
     *
     * @param articleId    the article being left
     * @param workspaceId  the workspace that owns the article
     * @param userId       the viewer leaving
     */
    public void remove(String articleId, String workspaceId, String userId) {
        ConcurrentHashMap<String, PresenceRecord> article = byArticle.get(articleId);
        if (article != null) {
            article.remove(userId);
            realtime.publish(workspaceId, "PRESENCE_UPDATE",
                    Map.of("articleId", articleId, "presences", getPresences(articleId)));
        }
    }

    /**
     * Return the current (non-stale) presence list for an article. Stale entries are pruned
     * inline on every read so the response never includes a viewer whose tab is long closed.
     *
     * @param articleId the article to query
     * @return live presence records, possibly empty
     */
    public List<PresenceRecord> getPresences(String articleId) {
        ConcurrentHashMap<String, PresenceRecord> article = byArticle.get(articleId);
        if (article == null) return List.of();
        Instant cutoff = Instant.now().minusSeconds(TTL_SECONDS);
        article.entrySet().removeIf(e -> e.getValue().lastSeen().isBefore(cutoff));
        return new ArrayList<>(article.values());
    }

    /**
     * Scheduled cleanup: evict records across all articles where lastSeen has exceeded the TTL.
     * Runs every 15 seconds; does not broadcast (the next heartbeat or join will do so).
     */
    @Scheduled(fixedDelay = 15_000)
    public void evictStale() {
        Instant cutoff = Instant.now().minusSeconds(TTL_SECONDS);
        byArticle.forEach((articleId, viewers) ->
            viewers.entrySet().removeIf(e -> e.getValue().lastSeen().isBefore(cutoff))
        );
        byArticle.entrySet().removeIf(e -> e.getValue().isEmpty());
    }
}
