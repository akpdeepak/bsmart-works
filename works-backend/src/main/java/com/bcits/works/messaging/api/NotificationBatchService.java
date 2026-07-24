package com.bcits.works.messaging.api;
import com.bcits.works.messaging.PushDeliveryService;

import com.bcits.works.FocusModeService;

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
    private final PushDeliveryService pushDelivery;

    public NotificationBatchService(NotificationRepository notificationRepository, JdbcTemplate jdbc,
                                    FocusModeService focusMode, PushDeliveryService pushDelivery) {
        this.notificationRepository = notificationRepository;
        this.jdbc = jdbc;
        this.focusMode = focusMode;
        this.pushDelivery = pushDelivery;
    }

    /**
     * Creates a notification only if no identical one exists within the batch window
     * <em>and</em> the user is not in a focus block that suppresses it.
     * Returns true if the notification was created, false if suppressed.
     */
    /** Workspace-scoped notification path used by all producers. */
    public boolean createIfNotBatched(String workspaceId, String userId, String type, String message, String link) {
        return createIfNotBatched(workspaceId, userId, type, message, link, false);
    }

    /** Workspace-scoped notification path with the P0 focus-mode override. */
    public boolean createIfNotBatched(String workspaceId, String userId, String type, String message,
                                      String link, boolean p0) {
        if (focusMode.isSuppressed(userId, p0)) {
            log.debug("[FOCUS] Held {} notification for user {} (in focus block; p0={})", type, userId, p0);
            return false;
        }
        OffsetDateTime windowStart = OffsetDateTime.now().minusMinutes(BATCH_WINDOW_MINUTES);
        List<Map<String, Object>> existing = jdbc.queryForList(
            "SELECT id FROM notifications " +
            "WHERE workspace_id IS NOT DISTINCT FROM ? AND user_id = ? AND type = ? AND link = ? "
                + "AND created_at >= ? AND is_read = false",
            workspaceId, userId, type, link, windowStart);

        if (!existing.isEmpty()) {
            log.debug("[BATCH] Suppressed duplicate {} notification for user {} (link={})", type, userId, link);
            return false;
        }

        Notification n = new Notification();
        n.setWorkspaceId(workspaceId);
        n.setUserId(userId);
        n.setType(type);
        n.setMessage(message);
        n.setLink(link);
        n.setRead(false);
        n.setCreatedAt(OffsetDateTime.now());
        notificationRepository.save(n);
        // Best-effort push delivery — failures are logged, never propagated (audit/business write always wins).
        try {
            String eventType = PushDeliveryService.inferEventType(type);
            if (eventType != null) {
                pushDelivery.dispatchForUser(userId, eventType, type, message, p0 ? "P0" : null);
            }
        } catch (Exception ex) {
            log.warn("[PUSH] Best-effort push dispatch failed for user={} type={}: {}", userId, type, ex.getMessage());
        }
        return true;
    }
}
