package com.bcits.works;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM symmetric encryption for credential storage (B23, B31, RB-40 §4).
 *
 * <p>The server-managed master key is read from {@code ENCRYPTION_KEY} env var (a 32-byte
 * Base64-encoded random value). Each encrypt call generates a fresh 12-byte nonce; the
 * encoded output is {@code base64(nonce || ciphertext || tag)} in a single string.
 *
 * <p>Key material never appears in logs (RB-10 §9 / RB-40 §2). This class does NOT handle
 * tenant BYOK — that delegates to {@link KmsProvider}. This class is the baseline for all
 * server-side at-rest encryption where BYOK is not yet enabled.
 */
@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int NONCE_LENGTH_BYTES = 12;

    private final SecretKey key;
    private final SecureRandom rng = new SecureRandom();

    public EncryptionService(@Value("${encryption.master-key:}") String masterKeyB64) {
        if (masterKeyB64 == null || masterKeyB64.isBlank()) {
            // Dev/test fallback: generate an ephemeral key. Data encrypted with this key is
            // lost on restart — acceptable in tests; production MUST set ENCRYPTION_KEY.
            byte[] ephemeral = new byte[32];
            new SecureRandom().nextBytes(ephemeral);
            this.key = new SecretKeySpec(ephemeral, "AES");
        } else {
            byte[] keyBytes = Base64.getDecoder().decode(masterKeyB64);
            if (keyBytes.length != 32) {
                throw new IllegalArgumentException("ENCRYPTION_KEY must be 32 bytes (256 bits) base64-encoded");
            }
            this.key = new SecretKeySpec(keyBytes, "AES");
        }
    }

    /** Encrypts {@code plaintext} and returns a base64-encoded {@code nonce||ciphertext} blob. */
    public String encrypt(String plaintext) {
        if (plaintext == null) return null;
        try {
            byte[] nonce = new byte[NONCE_LENGTH_BYTES];
            rng.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, nonce));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            byte[] combined = ByteBuffer.allocate(NONCE_LENGTH_BYTES + ciphertext.length)
                .put(nonce).put(ciphertext).array();
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    /** Decrypts a blob produced by {@link #encrypt}. Returns {@code null} if input is null. */
    public String decrypt(String blob) {
        if (blob == null) return null;
        try {
            byte[] combined = Base64.getDecoder().decode(blob);
            ByteBuffer buf = ByteBuffer.wrap(combined);
            byte[] nonce = new byte[NONCE_LENGTH_BYTES];
            buf.get(nonce);
            byte[] ciphertext = new byte[buf.remaining()];
            buf.get(ciphertext);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, nonce));
            return new String(cipher.doFinal(ciphertext), java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Decryption failed", e);
        }
    }
}
