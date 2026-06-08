package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * Outbound webhook behaviour (iteration 13, Cap Q): deterministic HMAC signing, event-type matching,
 * and the retry → dead-letter state machine (RB-10 §7 pure helpers).
 */
@Tag("unit")
class WebhookServiceTest {

    private final WebhookSubscriptionRepository subs = mock(WebhookSubscriptionRepository.class);
    private final WebhookDeliveryRepository deliveries = mock(WebhookDeliveryRepository.class);
    private final WebhookService svc = new WebhookService(subs, deliveries);

    @Test
    void sign_isDeterministicAndKeyed() {
        String a = WebhookService.sign("secret", "{\"x\":1}");
        String b = WebhookService.sign("secret", "{\"x\":1}");
        String c = WebhookService.sign("other", "{\"x\":1}");
        assertThat(a).isNotEmpty().isEqualTo(b).isNotEqualTo(c);
        assertThat(WebhookService.sign(null, "x")).isEmpty();
        assertThat(a).hasSize(64);   // SHA-256 hex
    }

    @Test
    void matches_supportsWildcard() {
        assertThat(WebhookService.matches("*", "ITEM_CREATED")).isTrue();
        assertThat(WebhookService.matches("ITEM_CREATED", "item_created")).isTrue();
        assertThat(WebhookService.matches("ITEM_CREATED", "STATUS_CHANGED")).isFalse();
    }

    @Test
    void decideStatus_deliveredFailedDeadLetter() {
        assertThat(WebhookService.decideStatus(true, 1, 5)).isEqualTo("DELIVERED");
        assertThat(WebhookService.decideStatus(false, 1, 5)).isEqualTo("FAILED");
        assertThat(WebhookService.decideStatus(false, 5, 5)).isEqualTo("DEAD_LETTER");
    }

    @Test
    void attempt_succeedsForNormalUrl() {
        WebhookDelivery d = new WebhookDelivery();
        d.setAttempts(0);
        d.setMaxAttempts(5);
        svc.attempt(d, "https://hooks.example.com/x");
        assertThat(d.getStatus()).isEqualTo("DELIVERED");
        assertThat(d.getResponseCode()).isEqualTo(200);
        assertThat(d.getAttempts()).isEqualTo(1);
    }

    @Test
    void attempt_deadLettersAfterMaxFailures() {
        WebhookDelivery d = new WebhookDelivery();
        d.setAttempts(4);
        d.setMaxAttempts(5);
        svc.attempt(d, "https://fail.example.com/x");   // "fail" → simulated rejection
        assertThat(d.getAttempts()).isEqualTo(5);
        assertThat(d.getStatus()).isEqualTo("DEAD_LETTER");
        assertThat(d.getResponseCode()).isEqualTo(503);
    }
}
