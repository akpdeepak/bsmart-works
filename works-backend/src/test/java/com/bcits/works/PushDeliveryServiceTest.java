package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Web Push delivery behaviour (iteration 18, Cap S): preference gate, deterministic seam,
 * and the notification-type → event-type mapping (RB-10 §7).
 */
@Tag("unit")
class PushDeliveryServiceTest {

    private static final String USER = "user-1";

    private final PushSubscriptionRepository subs = mock(PushSubscriptionRepository.class);
    private final PushPreferenceService prefs = mock(PushPreferenceService.class);
    private final PushDeliveryService svc = new PushDeliveryService(subs, prefs);

    // ── preference gate ────────────────────────────────────────────────────────

    @Test
    void dispatchForUser_skipsWhenPreferenceGateSuppresses() {
        NotificationPreference pref = new NotificationPreference();
        pref.setPushEnabled(false);
        when(prefs.get(USER)).thenReturn(pref);
        when(prefs.shouldDeliver(eq(pref), any(), any(), any())).thenReturn(false);

        PushDeliveryService.DeliveryResult r = svc.dispatchForUser(USER, "COMMENT", "New comment", "body", null);

        assertThat(r).isEqualTo(PushDeliveryService.DeliveryResult.SKIPPED);
        verify(subs, never()).findByUserId(any());
    }

    @Test
    void dispatchForUser_skipsWhenNoSubscriptions() {
        NotificationPreference pref = new NotificationPreference();
        when(prefs.get(USER)).thenReturn(pref);
        when(prefs.shouldDeliver(any(), any(), any(), any())).thenReturn(true);
        when(subs.findByUserId(USER)).thenReturn(List.of());

        assertThat(svc.dispatchForUser(USER, "ASSIGN", "Assigned", "body", null))
            .isEqualTo(PushDeliveryService.DeliveryResult.SKIPPED);
    }

    // ── deterministic seam ─────────────────────────────────────────────────────

    @Test
    void deliver_succeededForNormalEndpoint() {
        PushSubscription sub = new PushSubscription();
        sub.setId("sub-1");
        sub.setEndpoint("https://push.example.com/sub/xyz");
        assertThat(svc.deliver(sub, "New comment", "body"))
            .isEqualTo(PushDeliveryService.DeliveryResult.DELIVERED);
    }

    @Test
    void deliver_failsForFailEndpoint() {
        PushSubscription sub = new PushSubscription();
        sub.setId("sub-2");
        sub.setEndpoint("https://fail.push.example.com/sub/xyz");
        assertThat(svc.deliver(sub, "New comment", "body"))
            .isEqualTo(PushDeliveryService.DeliveryResult.FAILED);
    }

    // ── event-type mapping ─────────────────────────────────────────────────────

    @Test
    void inferEventType_mapsKnownTypes() {
        assertThat(PushDeliveryService.inferEventType("ASSIGNED")).isEqualTo("ASSIGN");
        assertThat(PushDeliveryService.inferEventType("COMMENT_ADDED")).isEqualTo("COMMENT");
        assertThat(PushDeliveryService.inferEventType("STATUS_CHANGED")).isEqualTo("STATUS_CHANGE");
        assertThat(PushDeliveryService.inferEventType("SLA_BREACH")).isEqualTo("SLA_BREACH");
        assertThat(PushDeliveryService.inferEventType("AUTOMATION_NOTIFY")).isEqualTo("AUTOMATION");
        assertThat(PushDeliveryService.inferEventType("SOMETHING_ELSE")).isNull();
        assertThat(PushDeliveryService.inferEventType(null)).isNull();
    }
}
