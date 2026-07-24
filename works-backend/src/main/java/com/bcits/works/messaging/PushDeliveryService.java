package com.bcits.works.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;

/**
 * Web Push delivery (iteration 18, Cap S). For each user, loads their subscriptions, applies the
 * preference gate ({@link PushPreferenceService#shouldDeliver}), then dispatches one push per active
 * subscription.
 *
 * <p>Delivery is a deterministic seam — exactly like the webhook service — so the push
 * infrastructure is fully exercisable today without a live push relay. A URL that contains "fail"
 * simulates an unreachable endpoint; anything else is treated as delivered. The real HTTP/2 + VAPID
 * + RFC-8188 encrypted sender replaces the seam method when the push relay is provisioned,
 * without touching callers.
 */
@Service
public class PushDeliveryService {

    private static final Logger log = LoggerFactory.getLogger(PushDeliveryService.class);

    public enum DeliveryResult { DELIVERED, FAILED, SKIPPED }

    private final PushSubscriptionRepository subscriptions;
    private final PushPreferenceService preferences;

    public PushDeliveryService(PushSubscriptionRepository subscriptions, PushPreferenceService preferences) {
        this.subscriptions = subscriptions;
        this.preferences = preferences;
    }

    /**
     * Dispatch a push notification for a single user. Applies the preference gate first; if the
     * user's settings suppress delivery (quiet hours, snooze, type opt-out), returns SKIPPED without
     * touching the subscriptions list.
     *
     * @param userId    recipient
     * @param eventType maps to per-type toggle in {@link NotificationPreference}
     * @param title     notification title (≤64 chars recommended)
     * @param body      notification body
     * @param priority  "P0" or "CRITICAL" to pierce quiet hours/snooze; null for normal
     * @return highest-ranked result across all subscriptions (DELIVERED &gt; FAILED &gt; SKIPPED)
     */
    public DeliveryResult dispatchForUser(String userId, String eventType,
                                          String title, String body, String priority) {
        NotificationPreference pref = preferences.get(userId);
        if (!preferences.shouldDeliver(pref, eventType, priority, OffsetDateTime.now())) {
            log.debug("[PUSH] Skipped push for user={} type={} (preference gate)", userId, eventType);
            return DeliveryResult.SKIPPED;
        }

        List<PushSubscription> subs = subscriptions.findByUserId(userId);
        if (subs.isEmpty()) {
            return DeliveryResult.SKIPPED;
        }

        DeliveryResult best = DeliveryResult.SKIPPED;
        for (PushSubscription sub : subs) {
            DeliveryResult r = deliver(sub, title, body);
            if (r == DeliveryResult.DELIVERED) {
                best = DeliveryResult.DELIVERED;
            } else if (r == DeliveryResult.FAILED && best != DeliveryResult.DELIVERED) {
                best = DeliveryResult.FAILED;
            }
        }
        return best;
    }

    // ── Delivery seam (swap for real VAPID/RFC-8188 send when relay is provisioned) ──────────────

    /**
     * One delivery attempt against the deterministic seam. An endpoint that contains "fail"
     * simulates a 410-Gone response; all others are treated as delivered. The real implementation
     * will encrypt the payload (ECDH + AES-128-GCM, RFC 8188) and POST to the push service endpoint
     * with a VAPID Authorization header.
     */
    DeliveryResult deliver(PushSubscription sub, String title, String body) {
        String endpoint = sub.getEndpoint();
        boolean failed = endpoint == null
            || endpoint.toLowerCase(Locale.ROOT).contains("fail");
        if (failed) {
            log.debug("[PUSH] Delivery failed for sub={} (endpoint rejected)", sub.getId());
            return DeliveryResult.FAILED;
        }
        log.debug("[PUSH] Delivered push for sub={} endpoint prefix={}", sub.getId(),
            endpoint.substring(0, Math.min(40, endpoint.length())));
        return DeliveryResult.DELIVERED;
    }

    // ── Pure helpers (RB-10 §7) ────────────────────────────────────────────────────────────────────

    /** Maps notification type (from NotificationBatchService) to the push event-type vocabulary. */
    // Public only so messaging.api.NotificationBatchService can reach it across the api/internal
    // package split (GH-537). PushDeliveryService itself stays internal to the messaging module, so
    // widening this method does not widen the module's contract — crossModuleAccessGoesThroughApi
    // still forbids any other module from touching it.
    public static String inferEventType(String notificationType) {
        if (notificationType == null) return null;
        return switch (notificationType.toUpperCase(Locale.ROOT)) {
            case "ASSIGNED", "ASSIGN" -> "ASSIGN";
            case "COMMENT_ADDED", "COMMENT" -> "COMMENT";
            case "MENTION" -> "MENTION";
            case "STATUS_CHANGED", "STATUS" -> "STATUS_CHANGE";
            case "SLA_BREACH" -> "SLA_BREACH";
            case "AUTOMATION_NOTIFY", "AUTOMATION" -> "AUTOMATION";
            default -> null;
        };
    }
}
