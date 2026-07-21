package com.bcits.works.shared;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

/** AES-256-GCM round-trip and edge cases. */
@Tag("unit")
class EncryptionServiceTest {

    private final EncryptionService service = new EncryptionService(""); // ephemeral key

    @Test
    void roundTrip_encryptThenDecrypt_returnsOriginal() {
        String plain = "super-secret-token-xyz";
        String encrypted = service.encrypt(plain);
        assertThat(encrypted).isNotEqualTo(plain);
        assertThat(service.decrypt(encrypted)).isEqualTo(plain);
    }

    @Test
    void eachEncrypt_producesDifferentCiphertext_dueToFreshNonce() {
        String plain = "same-value";
        String c1 = service.encrypt(plain);
        String c2 = service.encrypt(plain);
        assertThat(c1).isNotEqualTo(c2);
        assertThat(service.decrypt(c1)).isEqualTo(service.decrypt(c2));
    }

    @Test
    void nullInput_returnsNull() {
        assertThat(service.encrypt(null)).isNull();
        assertThat(service.decrypt(null)).isNull();
    }

    @Test
    void withExplicitKey_roundTripWorks() {
        byte[] keyBytes = new byte[32];
        new java.security.SecureRandom().nextBytes(keyBytes);
        EncryptionService keyed = new EncryptionService(Base64.getEncoder().encodeToString(keyBytes));
        String encrypted = keyed.encrypt("workspace-token");
        assertThat(keyed.decrypt(encrypted)).isEqualTo("workspace-token");
    }
}
