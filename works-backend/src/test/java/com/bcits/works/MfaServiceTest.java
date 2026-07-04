package com.bcits.works;

import com.bcits.works.auth.MfaService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class MfaServiceTest {

    private final MfaService mfa = new MfaService();

    @Test
    void generatedSecretRoundTripsThroughTotpValidation() {
        String secret = mfa.generateBase64Secret();
        Instant now = Instant.parse("2026-06-04T10:00:00Z");
        String code = mfa.currentCode(secret, now);
        assertThat(code).matches("\\d{6}");
        assertThat(mfa.validateTotp(secret, code, now)).isTrue();
    }

    @Test
    void validateTotp_acceptsCodeOneStepInThePast() {
        String secret = mfa.generateBase64Secret();
        Instant now = Instant.parse("2026-06-04T10:00:00Z");
        String earlierCode = mfa.currentCode(secret, now.minusSeconds(30));
        assertThat(mfa.validateTotp(secret, earlierCode, now)).isTrue();
    }

    @Test
    void validateTotp_rejectsWrongCode() {
        String secret = mfa.generateBase64Secret();
        Instant now = Instant.parse("2026-06-04T10:00:00Z");
        String code = mfa.currentCode(secret, now);
        String wrong = code.equals("000000") ? "111111" : "000000";
        assertThat(mfa.validateTotp(secret, wrong, now)).isFalse();
    }

    @Test
    void validateTotp_rejectsNullAndMalformedCodes() {
        String secret = mfa.generateBase64Secret();
        Instant now = Instant.now();
        assertThat(mfa.validateTotp(secret, null, now)).isFalse();
        assertThat(mfa.validateTotp(secret, "123", now)).isFalse();
        assertThat(mfa.validateTotp(null, "123456", now)).isFalse();
    }

    @Test
    void otpAuthUri_isWellFormedForAuthenticatorApps() {
        String secret = mfa.generateBase64Secret();
        String uri = mfa.otpAuthUri("dev@bcits.in", secret);
        assertThat(uri).startsWith("otpauth://totp/bSmartWorks:dev@bcits.in?secret=");
        assertThat(uri).contains("issuer=bSmartWorks").contains("algorithm=SHA1")
                       .contains("digits=6").contains("period=30");
        assertThat(mfa.base32FromBase64(secret)).matches("[A-Z2-7]+");
    }
}
