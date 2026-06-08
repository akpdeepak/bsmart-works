package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * BYOK data-key rotation (B31, RB-40 §3). Rotates the workspace data key via the configured
 * {@link KmsProvider}, then re-encrypts all {@link PiiVaultEntry} rows for the workspace under
 * the new key. The rotation event is appended to the tamper-evident audit chain — every key
 * change is auditable and non-repudiable.
 *
 * <p>In local dev/test the {@link LocalKmsProvider} is used — re-encryption is a no-op that
 * returns the original ciphertext unchanged, so tests can exercise the rotation plumbing without
 * real KMS. In production an {@link AwsKmsProvider} would call AWS KMS GenerateDataKey +
 * ReEncrypt (requires legal/DPO sign-off per RB-40 §3 and TD-022).
 *
 * <p>Workspace isolation: rotation is a single-workspace operation. The service never touches
 * another workspace's PII entries (RB-40 §1). RBAC is enforced by the caller before invoking
 * this service.
 */
@Service
public class KeyRotationService {

    private static final Logger log = LoggerFactory.getLogger(KeyRotationService.class);

    private final PiiVaultRepository piiVault;
    private final WorkspaceSecuritySettingsService securitySettings;
    private final SecurityAuditLogService auditLog;
    private final KmsProvider kmsProvider;

    public KeyRotationService(PiiVaultRepository piiVault,
                              WorkspaceSecuritySettingsService securitySettings,
                              SecurityAuditLogService auditLog,
                              KmsProvider kmsProvider) {
        this.piiVault = piiVault;
        this.securitySettings = securitySettings;
        this.auditLog = auditLog;
        this.kmsProvider = kmsProvider;
    }

    /** Represents the result of a key rotation operation. */
    public record RotationResult(String workspaceId, String newKeyRef, int reEncryptedCount,
                                 String kmsProvider, OffsetDateTime rotatedAt) { }

    /**
     * Rotates the workspace data key.
     *
     * <ol>
     *   <li>Generates a new data key via {@link KmsProvider#generateDataKey}.</li>
     *   <li>Re-encrypts every {@link PiiVaultEntry} for the workspace under the new key.</li>
     *   <li>Updates the workspace's {@code byok_key_ref} to the new key reference.</li>
     *   <li>Appends a {@code KEY_ROTATED} event to the tamper-evident audit chain.</li>
     * </ol>
     *
     * @param workspaceId the workspace whose data key is being rotated
     * @param actorId     the user ID initiating the rotation (written to the audit log)
     * @return a summary of the rotation operation
     */
    @Transactional
    public RotationResult rotate(String workspaceId, String actorId) {
        WorkspaceSecuritySettings settings = securitySettings.get(workspaceId);
        String oldKeyRef = settings.getByokKeyRef();

        log.info("[KEY-ROTATION] Starting key rotation for workspace={} provider={}", workspaceId, kmsProvider.name());

        // Generate new data key
        String newKeyRef = kmsProvider.generateDataKey(workspaceId);

        // Re-encrypt all PII vault entries for this workspace
        List<PiiVaultEntry> entries = piiVault.findByWorkspaceId(workspaceId);
        int count = 0;
        OffsetDateTime now = OffsetDateTime.now();
        for (PiiVaultEntry entry : entries) {
            String reEncrypted = kmsProvider.reEncrypt(workspaceId, oldKeyRef, newKeyRef, entry.getEncryptedValue());
            entry.setEncryptedValue(reEncrypted);
            entry.setKeyVersion(newKeyRef);
            entry.setUpdatedAt(now);
            piiVault.save(entry);
            count++;
        }

        // Update workspace security settings with the new key reference
        settings.setByokKeyRef(newKeyRef);
        settings.setUpdatedBy(actorId);
        settings.setUpdatedAt(now);
        securitySettings.update(workspaceId, actorId, settings);

        // Append to tamper-evident audit chain (RB-40 §3 — every key change is auditable)
        String detail = "{\"kmsProvider\":\"" + kmsProvider.name()
            + "\",\"reEncryptedEntries\":" + count
            + ",\"newKeyRef\":\"" + newKeyRef.replaceAll("\"", "'") + "\"}";
        auditLog.record(workspaceId, actorId, "KEY_ROTATED", "workspace", workspaceId, detail);

        log.info("[KEY-ROTATION] Completed rotation for workspace={} reEncryptedEntries={}", workspaceId, count);
        return new RotationResult(workspaceId, newKeyRef, count, kmsProvider.name(), now);
    }
}
