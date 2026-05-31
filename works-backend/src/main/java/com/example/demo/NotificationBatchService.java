package com.example.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Smart notification batching.
 *
 * Before creating a new notification, check if an identical notification
 * (same userId + type + link) was created within the last 5 minutes.
 * If yes, suppress the duplicate — the user already has that context.
 * This prevents inbox flood when e.g. 10 comments arrive on the same item
 * within a few minutes.
 */
@Service
public class NotificationBatchService {

    private static final Logger log = LoggerFactory.getLogger(NotificationBatchService.class);
    private static final int BATCH_WINDOW_MINUTES = 5;

    private final NotificationRepository notificationRepository;
    private final JdbcTemplate jdbc;

    public NotificationBatchService(NotificationRepository notificationRepository, JdbcTemplate jdbc) {
        this.notificationRepository = notificationRepository;
        this.jdbc = jdbc;
    }

    /**
     * Creates a notification only if no identical one exists within the batch window.
     * Returns true if the notification was created, false if suppressed.
     */
    public boolean createIfNotBatched(String userId, String type, String message, String link) {
        OffsetDateTime windowStart = OffsetDateTime.now().minusMinutes(BATCH_WINDOW_MINUTES);
        List<Map<String, Object>> existing = jdbc.queryForList(
            "SELECT id FROM notifications " +
            "WHERE user_id = ? AND type = ? AND link = ? AND created_at >= ? AND is_read = false",
            userId, type, link, windowStart);

        if (!existing.isEmpty()) {
            log.debug("[BATCH] Suppressed duplicate {} notification for user {} (link={})", type, userId, link);
            return false;
        }

        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setMessage(message);
        n.setLink(link);
        n.setRead(false);
        n.setCreatedAt(OffsetDateTime.now());
        notificationRepository.save(n);
        return true;
    }
}
