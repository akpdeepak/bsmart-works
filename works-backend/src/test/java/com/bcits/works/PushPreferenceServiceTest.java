package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@Tag("unit")
class PushPreferenceServiceTest {

    private final NotificationPreferenceRepository repo = mock(NotificationPreferenceRepository.class);
    private final PushPreferenceService service = new PushPreferenceService(repo);

    private NotificationPreference pref() {
        NotificationPreference p = new NotificationPreference();
        p.setUserId("USR-1");
        p.setPushEnabled(true);
        return p;
    }

    private OffsetDateTime at(int hour) {
        return OffsetDateTime.of(2026, 6, 7, hour, 0, 0, 0, ZoneOffset.UTC);
    }

    // ── happy path ────────────────────────────────────────────────────────────
    @Test
    void deliversWhenEnabledAndOutsideQuietHours() {
        assertTrue(service.shouldDeliver(pref(), "COMMENT", "P2", at(12)));
    }

    // ── disabled / empty ─────────────────────────────────────────────────────
    @Test
    void neverDeliversWhenPushDisabled() {
        NotificationPreference p = pref();
        p.setPushEnabled(false);
        assertFalse(service.shouldDeliver(p, "COMMENT", "P0", at(12)));
    }

    @Test
    void nullPrefDoesNotDeliver() {
        assertFalse(service.shouldDeliver(null, "COMMENT", "P2", at(12)));
    }

    // ── per-event-type opt-out ────────────────────────────────────────────────
    @Test
    void respectsPerEventTypeToggle() {
        NotificationPreference p = pref();
        p.setNotifyComment(false);
        assertFalse(service.shouldDeliver(p, "COMMENT", "P2", at(12)));
        assertTrue(service.shouldDeliver(p, "MENTION", "P2", at(12)));
    }

    // ── quiet hours (with wrap-around) ────────────────────────────────────────
    @Test
    void suppressesInsideWrappingQuietHours() {
        NotificationPreference p = pref();
        p.setQuietHoursEnabled(true);
        p.setQuietHoursStart(22);
        p.setQuietHoursEnd(7);
        p.setP0OverrideQuiet(false);
        assertFalse(service.shouldDeliver(p, "COMMENT", "P2", at(23))); // inside
        assertFalse(service.shouldDeliver(p, "COMMENT", "P2", at(3)));  // inside (wrapped)
        assertTrue(service.shouldDeliver(p, "COMMENT", "P2", at(12)));  // outside
    }

    // ── P0 overrides quiet hours ──────────────────────────────────────────────
    @Test
    void p0PiercesQuietHoursWhenOverrideOn() {
        NotificationPreference p = pref();
        p.setQuietHoursEnabled(true);
        p.setQuietHoursStart(22);
        p.setQuietHoursEnd(7);
        p.setP0OverrideQuiet(true);
        assertTrue(service.shouldDeliver(p, "SLA_BREACH", "P0", at(3)));
        assertTrue(service.shouldDeliver(p, "SLA_BREACH", "critical", at(3)));
        // a non-critical event is still suppressed
        assertFalse(service.shouldDeliver(p, "SLA_BREACH", "P2", at(3)));
    }

    // ── snooze ────────────────────────────────────────────────────────────────
    @Test
    void snoozeSuppressesNonCriticalButP0CanPierce() {
        NotificationPreference p = pref();
        p.setSnoozeUntil(at(14));
        p.setP0OverrideQuiet(true);
        assertFalse(service.shouldDeliver(p, "COMMENT", "P2", at(12))); // before deadline
        assertTrue(service.shouldDeliver(p, "SLA_BREACH", "P0", at(12)));
        assertTrue(service.shouldDeliver(p, "COMMENT", "P2", at(15)));  // after deadline
    }

    // ── validation ────────────────────────────────────────────────────────────
    @Test
    void rejectsOutOfRangeQuietHours() {
        NotificationPreference p = pref();
        p.setQuietHoursStart(24);
        ApiException ex = assertThrows(ApiException.class, () -> service.save(p));
        assertEquals("INVALID_QUIET_HOURS", ex.getCode());
    }

    @Test
    void getSeedsDefaultsWhenAbsent() {
        when(repo.findById("USR-9")).thenReturn(java.util.Optional.empty());
        when(repo.save(org.mockito.ArgumentMatchers.any(NotificationPreference.class)))
                .thenAnswer(i -> i.getArgument(0));
        NotificationPreference p = service.get("USR-9");
        assertEquals("USR-9", p.getUserId());
        assertTrue(p.isNotifyAssign());
    }
}
