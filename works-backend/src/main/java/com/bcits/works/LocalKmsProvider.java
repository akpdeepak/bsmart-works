package com.bcits.works;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory {@link KmsProvider} for dev and test (B31). Active when no {@link AwsKmsProvider}
 * bean is registered (i.e. when {@code AWS_ACCESS_KEY_ID} is absent).
 *
 * <p>Keys survive the JVM lifetime only — data encrypted in one process instance cannot be
 * decrypted by another. This is intentional and acceptable for local dev. Production must use
 * {@link AwsKmsProvider}.
 */
@Component
@ConditionalOnMissingBean(AwsKmsProvider.class)
public class LocalKmsProvider implements KmsProvider {

    private final Map<String, byte[]> keyStore = new ConcurrentHashMap<>();

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
}
