package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class PasswordResetServiceTest {

    // Pure helpers don't touch the injected collaborators, so nulls are fine here.
    private final PasswordResetService service =
            new PasswordResetService(null, null, null, null, "http://localhost:5173");

    @Test
    void newToken_isLongOpaqueAndUnique() {
        String a = service.newToken();
        String b = service.newToken();
        assertThat(a).hasSize(64).matches("[0-9a-f]+");
        assertThat(a).isNotEqualTo(b);
    }

    @Test
    void expiryFrom_isSixtyMinutesAhead() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-04T10:00:00Z");
        assertThat(service.expiryFrom(now)).isEqualTo(now.plusMinutes(60));
    }

    @Test
    void isUsable_trueForUnusedUnexpiredToken() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-04T10:00:00Z");
        assertThat(service.isUsable(token(now.plusMinutes(10), false), now)).isTrue();
    }

    @Test
    void isUsable_falseWhenExpired() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-04T10:00:00Z");
        assertThat(service.isUsable(token(now.minusSeconds(1), false), now)).isFalse();
    }

    @Test
    void isUsable_falseWhenUsed() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-04T10:00:00Z");
        assertThat(service.isUsable(token(now.plusMinutes(10), true), now)).isFalse();
    }

    @Test
    void isUsable_falseWhenNull() {
        assertThat(service.isUsable(null, OffsetDateTime.now())).isFalse();
    }

    private PasswordResetToken token(OffsetDateTime expiresAt, boolean used) {
        PasswordResetToken t = new PasswordResetToken();
        t.setToken("tok");
        t.setUserId("USR-1");
        t.setExpiresAt(expiresAt);
        t.setUsed(used);
        return t;
    }
}
