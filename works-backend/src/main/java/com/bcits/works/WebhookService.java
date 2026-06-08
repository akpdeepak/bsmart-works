package com.bcits.works;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Outbound webhook delivery (iteration 13, Cap Q): per-event-type subscriptions, HMAC-signed
 * payloads, retry with a dead-letter terminal state, and an append-only delivery log (RB-20 §5).
 * Workspace-scoped (RB-40 §1). There is no live network egress in this build — delivery is a
 * deterministic seam (a URL containing "fail" simulates an endpoint that rejects), exactly like the
 * AI provider seam, so retry / dead-letter behaviour is real and testable today and a real HTTP
 * sender plugs in later without touching callers.
 */
@Service
public class WebhookService {

    private final WebhookSubscriptionRepository subscriptions;
    private final WebhookDeliveryRepository deliveries;
    private final ObjectMapper json = new ObjectMapper();

    public WebhookService(WebhookSubscriptionRepository subscriptions, WebhookDeliveryRepository deliveries) {
        this.subscriptions = subscriptions;
        this.deliveries = deliveries;
    }

    // ── Subscriptions ─────────────────────────────────────────────────────────────

    public List<WebhookSubscription> list(String workspaceId) {
        return subscriptions.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }

    @Transactional
    public WebhookSubscription create(String workspaceId, String creatorId, WebhookSubscription sub) {
        if (sub.getTargetUrl() == null || sub.getTargetUrl().isBlank()) {
            throw ApiException.badRequest("MISSING_URL", "targetUrl is required.", "targetUrl");
        }
        sub.setId("WHS-" + shortId());
        sub.setWorkspaceId(workspaceId);
        sub.setEventType(sub.getEventType() == null || sub.getEventType().isBlank() ? "*" : sub.getEventType());
        sub.setActive(sub.getActive() == null ? true : sub.getActive());
        sub.setCreatedBy(creatorId);
        OffsetDateTime now = OffsetDateTime.now();
        sub.setCreatedAt(now);
        sub.setUpdatedAt(now);
        return subscriptions.save(sub);
    }

    @Transactional
    public void delete(String workspaceId, String id) {
        WebhookSubscription s = subscriptions.findById(id)
            .orElseThrow(() -> ApiException.notFound("Webhook subscription", id));
        if (!workspaceId.equals(s.getWorkspaceId())) {
            throw ApiException.forbidden("Subscription belongs to a different workspace.");
        }
        subscriptions.delete(s);
    }

    // ── Delivery ──────────────────────────────────────────────────────────────────

    /** Enqueue + attempt one delivery per active subscription matching the event type (or '*'). */
    @Transactional
    public int enqueue(String workspaceId, String eventType, Map<String, ?> payload) {
        String body = toJson(payload);
        int created = 0;
        for (WebhookSubscription sub : subscriptions.findByWorkspaceIdAndActiveTrue(workspaceId)) {
            if (!matches(sub.getEventType(), eventType)) {
                continue;
            }
            WebhookDelivery d = new WebhookDelivery();
            d.setId("WHD-" + shortId());
            d.setWorkspaceId(workspaceId);
            d.setSubscriptionId(sub.getId());
            d.setEventType(eventType);
            d.setPayload(body);
            d.setSignature(sign(sub.getSecret(), body));
            d.setStatus("PENDING");
            d.setAttempts(0);
            d.setMaxAttempts(5);
            OffsetDateTime now = OffsetDateTime.now();
            d.setCreatedAt(now);
            d.setUpdatedAt(now);
            attempt(d, sub.getTargetUrl());
            deliveries.save(d);
            created++;
        }
        return created;
    }

    /** One delivery attempt against the deterministic seam, advancing the retry/dead-letter state. */
    void attempt(WebhookDelivery d, String targetUrl) {
        d.setAttempts((d.getAttempts() == null ? 0 : d.getAttempts()) + 1);
        boolean delivered = targetUrl != null && !targetUrl.toLowerCase(java.util.Locale.ROOT).contains("fail");
        d.setStatus(decideStatus(delivered, d.getAttempts(), d.getMaxAttempts()));
        d.setResponseCode(delivered ? 200 : 503);
        d.setLastError(delivered ? null : "Endpoint returned 503 (simulated)");
        d.setUpdatedAt(OffsetDateTime.now());
    }

    @Transactional
    public WebhookDelivery redeliver(String workspaceId, String deliveryId) {
        WebhookDelivery d = deliveries.findById(deliveryId)
            .orElseThrow(() -> ApiException.notFound("Webhook delivery", deliveryId));
        if (!workspaceId.equals(d.getWorkspaceId())) {
            throw ApiException.forbidden("Delivery belongs to a different workspace.");
        }
        WebhookSubscription sub = subscriptions.findById(d.getSubscriptionId()).orElse(null);
        attempt(d, sub == null ? null : sub.getTargetUrl());
        return deliveries.save(d);
    }

    public Page<WebhookDelivery> deliveryLog(String workspaceId, Pageable pageable) {
        return deliveries.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId, pageable);
    }

    // ── Pure helpers (unit-testable, RB-10 §7) ───────────────────────────────────

    /** Terminal/retry status: DELIVERED on success; DEAD_LETTER once attempts exhaust; else FAILED. */
    static String decideStatus(boolean delivered, int attempts, int maxAttempts) {
        if (delivered) {
            return "DELIVERED";
        }
        return attempts >= maxAttempts ? "DEAD_LETTER" : "FAILED";
    }

    static boolean matches(String subscribed, String eventType) {
        return "*".equals(subscribed) || (subscribed != null && subscribed.equalsIgnoreCase(eventType));
    }

    /** HMAC-SHA256 hex signature of the payload under the subscription secret (empty secret → ""). */
    static String sign(String secret, String payload) {
        if (secret == null || secret.isBlank()) {
            return "";
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal((payload == null ? "" : payload).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(raw.length * 2);
            for (byte b : raw) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16)).append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private String toJson(Map<String, ?> payload) {
        try {
            return json.writeValueAsString(payload == null ? Map.of() : payload);
        } catch (Exception e) {
            return "{}";
        }
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
