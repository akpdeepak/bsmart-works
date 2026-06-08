package com.bcits.works;

/**
 * Abstraction over key management (B31, RB-40 §3 BYOK). The concrete implementation is chosen
 * at startup: {@link AwsKmsProvider} when {@code AWS_ACCESS_KEY_ID} is set (production BYOK),
 * {@link LocalKmsProvider} otherwise (dev/test — in-memory key store).
 *
 * <p>Key material is never logged and never passes through the service layer as plaintext — only
 * encrypted blobs and key references are stored in the database.
 */
public interface KmsProvider {

    /** Human-readable provider name for audit records. */
    String name();

    /**
     * Generates a new data encryption key for {@code workspaceId}. Returns the key material
     * as a Base64-encoded string suitable for AES-256 encryption.
     *
     * @param workspaceId tenant identifier (used as the KMS key context)
     * @return Base64-encoded 32-byte key material
     */
    String generateDataKey(String workspaceId);

    /**
     * Re-encrypts {@code ciphertext} from the old key to the new key. Both keys are identified
     * by their opaque references (KMS key ARN, key-id, or local store key). Used by
     * {@link KeyRotationService} to rotate a workspace's data key without decrypting intermediate
     * plaintext on the server.
     *
     * @param workspaceId the owning workspace (for isolation + audit context)
     * @param oldKeyRef   reference to the currently active key
     * @param newKeyRef   reference to the newly generated key
     * @param ciphertext  the currently encrypted value to re-encrypt
     * @return the same plaintext re-encrypted under {@code newKeyRef}
     */
    String reEncrypt(String workspaceId, String oldKeyRef, String newKeyRef, String ciphertext);
}
