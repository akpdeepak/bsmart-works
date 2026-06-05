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
 *
 * <p>Iteration 14 (Cap U — focus mode): this is also the choke point that honours an active focus
 * block. While a user is in focus, a non-P0 notification is held back; only a P0 the block lets
 * through is delivered ({@link FocusModeService#isSuppressed}). Producers that know a notification
 * is a P0 incident call the {@code p0=true} overload; the default path treats it as non-urgent.
 */
@Service
public class NotificationBatchService {

    private static final Logger log = LoggerFactory.getLogger(NotificationBatchService.class);
    private static final int BATCH_WINDOW_MINUTES = 5;

    private final NotificationRepository notificationRepository;
    private final JdbcTemplate jdbc;
    private final FocusModeService focusMode;

    public NotificationBatchService(NotificationRepository notificationRepository, JdbcTemplate jdbc,
                                    FocusModeService focusMode) {
        this.notificationRepository = notificationRepository;
        this.jdbc = jdbc;
        this.focusMode = focusMode;
    }

    /**
     * Creates a notification only if no identical one exists within the batch window
     * <em>and</em> the user is not in a focus block that suppresses it.
     * Returns true if the notification was created, false if suppressed.
     */
    public boolean createIfNotBatched(String userId, String type, String message, String link) {
        return createIfNotBatched(userId, type, message, link, false);
    }

    /** As above, but {@code p0=true} marks a P0 incident that breaks through focus mode. */
    public boolean createIfNotBatched(String userId, String type, String message, String link, boolean p0) {
        if (focusMode.isSuppressed(userId, p0)) {
            log.debug("[FOCUS] Held {} notification for user {} (in focus block; p0={})", type, userId, p0);
            return false;
        }
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
