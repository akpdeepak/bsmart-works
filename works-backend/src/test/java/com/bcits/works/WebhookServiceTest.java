package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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

    @Test
    void rotateSecret_generatesNewSecretAndRejectsCrossWorkspace() {
        WebhookSubscription sub = new WebhookSubscription();
        sub.setId("WHS-1");
        sub.setWorkspaceId("ws-1");
        sub.setSecret("old-secret");
        when(subs.findById("WHS-1")).thenReturn(Optional.of(sub));
        when(subs.save(any(WebhookSubscription.class))).thenAnswer(i -> i.getArgument(0));

        WebhookService.RotatedSecret result = svc.rotateSecret("ws-1", "WHS-1");

        assertThat(result.newSecret()).startsWith("whsec_").isNotEqualTo("old-secret");
        assertThat(result.subscription().getSecret()).isEqualTo(result.newSecret());

        // cross-workspace rejection
        WebhookSubscription foreign = new WebhookSubscription();
        foreign.setId("WHS-2");
        foreign.setWorkspaceId("other-ws");
        when(subs.findById("WHS-2")).thenReturn(Optional.of(foreign));
        assertThatThrownBy(() -> svc.rotateSecret("ws-1", "WHS-2"))
            .isInstanceOf(ApiException.class);
    }
}
