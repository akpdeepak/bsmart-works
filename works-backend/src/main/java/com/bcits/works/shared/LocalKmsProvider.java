package com.bcits.works.shared;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

import javax.crypto.KeyGenerator;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory / master-key-derived {@link KmsProvider} for dev, test, and non-BYOK deployments (B31,
 * RB-40 §3). Active when no {@link AwsKmsProvider} bean is registered (i.e. when
 * {@code AWS_ACCESS_KEY_ID} is absent).
 *
 * <h2>Per-subject DEK envelope</h2>
 * The workspace KEK is <b>derived deterministically</b> from the server master secret
 * ({@code ENCRYPTION_KEY}) via {@code HMAC-SHA256(masterSecret, kekRef)}, where {@code kekRef}
 * encodes the workspace and a rotation version. Because the derivation is deterministic and the
 * {@code kekRef} is stored alongside every wrapped DEK, any wrapped DEK can always be unwrapped by
 * re-deriving its exact KEK — no KEK material is ever stored in the application database. A wrapped
 * DEK in a DB row (or a backup of one) is therefore useless without the master secret, and
 * destroying the {@code subject_data_keys} row (crypto-shred) makes that subject's DEK — and so any
 * lingering ciphertext — permanently unrecoverable.
 *
 * <p><b>Limitations (dev/test/non-BYOK only).</b> The master secret is a single static env key, not
 * a per-tenant HSM-held KEK; rotation version is tracked in memory; with no {@code ENCRYPTION_KEY}
 * set, an ephemeral master is generated (lost on restart). Real per-tenant key custody, HSM
 * isolation, scheduled-deletion windows, and backup-retention propagation (RB-40 §3 rule 2) land
 * with {@link AwsKmsProvider} (BYOK) — the next Phase-1 item (TD-022). Production MUST set
 * {@code ENCRYPTION_KEY} and, for tenants that require it, use {@code AwsKmsProvider}.
 */
@Component
@ConditionalOnMissingBean(AwsKmsProvider.class)
public class LocalKmsProvider implements KmsProvider {

    private final Map<String, byte[]> keyStore = new ConcurrentHashMap<>();
    /** Per-workspace current KEK rotation version (in-memory; dev/test). Default version is 1. */
    private final Map<String, Integer> kekVersion = new ConcurrentHashMap<>();
    private final byte[] masterSecret;
    private final EncryptionService encryption;

    /** No-arg convenience for unit tests with no Spring context (ephemeral master secret). */
    public LocalKmsProvider() {
        this("", new EncryptionService(""));
    }

    @Autowired
    public LocalKmsProvider(@Value("${encryption.master-key:}") String masterKeyB64, EncryptionService encryption) {
        this.encryption = encryption;
        if (masterKeyB64 == null || masterKeyB64.isBlank()) {
            byte[] ephemeral = new byte[32];
            new SecureRandom().nextBytes(ephemeral);
            this.masterSecret = ephemeral;
        } else {
            this.masterSecret = Base64.getDecoder().decode(masterKeyB64);
        }
    }

    @Override
    public String name() {
        return "local-dev";
    }

    @Override
    public String generateDataKey(String workspaceId) {
        try {
            KeyGenerator gen = KeyGenerator.getInstance("AES");
            gen.init(256);
            SecretKey key = gen.generateKey();
            String ref = "local:" + workspaceId + ":" + System.nanoTime();
            keyStore.put(ref, key.getEncoded());
            return ref;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate local data key", e);
        }
    }

    @Override
    public String reEncrypt(String workspaceId, String oldKeyRef, String newKeyRef, String ciphertext) {
        // In local mode there's no actual KMS — we just return the ciphertext unchanged.
        // In production AwsKmsProvider performs the real re-encrypt via KMS API.
        return ciphertext;
    }

    /** Returns the raw key bytes for a given ref (used by KeyRotationService in tests). */
    public byte[] getKeyBytes(String ref) {
        return keyStore.get(ref);
    }

    // ── Per-subject DEK envelope (RB-40 §3) ─────────────────────────────────────────────────────

    @Override
    public WrappedKey wrapDataKey(String workspaceId, byte[] dek) {
        String kekRef = currentKekRef(workspaceId);
        byte[] kek = deriveKek(kekRef);
        String wrapped = encryption.encryptWith(kek, Base64.getEncoder().encodeToString(dek));
        return new WrappedKey(kekRef, wrapped);
    }

    @Override
    public byte[] unwrapDataKey(String workspaceId, String kekRef, String wrappedDek) {
        byte[] kek = deriveKek(kekRef);
        String dekB64 = encryption.decryptWith(kek, wrappedDek);
        return Base64.getDecoder().decode(dekB64);
    }

    @Override
    public String rotateKek(String workspaceId) {
        int next = kekVersion.getOrDefault(workspaceId, 1) + 1;
        kekVersion.put(workspaceId, next);
        return kekRef(workspaceId, next);
    }

    private String currentKekRef(String workspaceId) {
        return kekRef(workspaceId, kekVersion.getOrDefault(workspaceId, 1));
    }

    private static String kekRef(String workspaceId, int version) {
        return "local-kek:" + workspaceId + ":v" + version;
    }

    /** Derive the 32-byte KEK for a kekRef: HMAC-SHA256(masterSecret, kekRef). Deterministic, so the
     *  same kekRef always yields the same KEK across restarts/instances that share the master secret. */
    private byte[] deriveKek(String kekRef) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(masterSecret, "HmacSHA256"));
            return mac.doFinal(kekRef.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("KEK derivation failed", e);
        }
    }
}
