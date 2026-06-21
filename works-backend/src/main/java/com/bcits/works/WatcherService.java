package com.bcits.works;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Set;

/**
 * Work-item watchers (followers). A watcher receives an in-app notification on any field change or
 * new comment for an item they follow (Deliver Cap). Watching is opt-in (the Watch button) and
 * automatic when a user is assigned or comments — so consent is the watch itself; fan-out is not
 * additionally gated on NotificationPreference.
 *
 * <p>Tenant safety: callers RBAC-check item access before {@link #watch}; the fan-out only ever
 * writes notifications to user ids already in the watcher set (i.e. who could see the item).
 */
@Service
public class WatcherService {

    private final JdbcTemplate jdbc;
    private final NotificationRepository notifications;

    public WatcherService(JdbcTemplate jdbc, NotificationRepository notifications) {
        this.jdbc = jdbc;
        this.notifications = notifications;
    }

    /** Idempotent — watching an already-watched item is a no-op. */
    public void watch(String workItemId, String userId) {
        if (workItemId == null || userId == null) return;
        jdbc.update("INSERT INTO work_item_watchers (work_item_id, user_id) VALUES (?, ?) "
                + "ON CONFLICT DO NOTHING", workItemId, userId);
    }

    public void unwatch(String workItemId, String userId) {
        jdbc.update("DELETE FROM work_item_watchers WHERE work_item_id = ? AND user_id = ?",
                workItemId, userId);
    }

    public List<String> watchers(String workItemId) {
        return jdbc.queryForList("SELECT user_id FROM work_item_watchers WHERE work_item_id = ?",
                String.class, workItemId);
    }

    public boolean isWatching(String workItemId, String userId) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM work_item_watchers WHERE work_item_id = ? AND user_id = ?",
                Integer.class, workItemId, userId);
        return n != null && n > 0;
    }

    /**
     * Fan out an in-app notification to every watcher of the item, except the ids in {@code exclude}
     * (typically the actor and anyone already notified for this change, to avoid duplicates).
     *
     * @param actorId the user who triggered the change (stored as an opaque reference, never a name —
     *                RB-40 §3); {@code message} must be NAME-FREE (e.g. "updated WRK-1 - title"), and
     *                the actor's display name is resolved at render. Pass {@code null} for a
     *                system-originated notification (no actor name is prepended).
     */
    public void notifyWatchers(String workItemId, String actorId, String message, Collection<String> exclude) {
        Set<String> skip = exclude == null ? Set.of() : Set.copyOf(exclude);
        for (String uid : watchers(workItemId)) {
            if (skip.contains(uid)) continue;
            Notification n = new Notification();
            n.setUserId(uid);
            n.setActorId(actorId);
            n.setType("WATCH");
            n.setMessage(message);
            n.setLink("/items/" + workItemId);
            n.setRead(false);
            n.setCreatedAt(OffsetDateTime.now());
            notifications.save(n);
        }
    }
}
