package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * Per-subject data-key rotation (B31, RB-40 §3). Rotates the workspace key-encryption key (KEK) via
 * the configured {@link KmsProvider}, then <b>re-wraps each subject's data key (DEK)</b> under the new
 * KEK — unwrap with the DEK's stored {@code keyRef}, wrap again under the rotated KEK. The DEKs
 * themselves (and therefore the {@link PiiVaultEntry} ciphertext encrypted under them) are unchanged,
 * so rotation is cheap and never decrypts personal data on the server. Crypto-shredded subjects are
 * skipped — a shredded DEK is never resurrected.
 *
 * <p>This replaces the earlier per-<i>workspace</i> single-key model, which made it impossible to
 * destroy one subject's key without affecting the others (RB-40 §3 §1). The unit of rotation — and of
 * destruction — is now one subject's DEK.
 *
 * <p>In local dev/test the {@link LocalKmsProvider} derives KEKs from the server master secret, so
 * rotation genuinely changes the wrapped bytes. In production an {@link AwsKmsProvider} would wrap/
 * unwrap via AWS KMS (requires legal/DPO sign-off per RB-40 §3 and TD-022).
 *
 * <p>Workspace isolation: rotation is a single-workspace operation; it never touches another
 * workspace's keys (RB-40 §1). RBAC is enforced by the caller. The rotation is appended to the
 * tamper-evident audit chain — every key change is auditable and non-repudiable.
 */
@Service
public class KeyRotationService {

    private static final Logger log = LoggerFactory.getLogger(KeyRotationService.class);

    private final SubjectDataKeyRepository subjectKeys;
    private final WorkspaceSecuritySettingsService securitySettings;
    private final SecurityAuditLogService auditLog;
    private final KmsProvider kmsProvider;

    public KeyRotationService(SubjectDataKeyRepository subjectKeys,
                              WorkspaceSecuritySettingsService securitySettings,
                              SecurityAuditLogService auditLog,
                              KmsProvider kmsProvider) {
        this.subjectKeys = subjectKeys;
        this.securitySettings = securitySettings;
        this.auditLog = auditLog;
        this.kmsProvider = kmsProvider;
    }

    /** Represents the result of a key rotation operation. {@code reWrappedCount} is the number of
     *  active subject DEKs re-wrapped under the new KEK. */
    public record RotationResult(String workspaceId, String newKeyRef, int reWrappedCount,
                                 String kmsProvider, OffsetDateTime rotatedAt) { }

    /**
     * Rotates the workspace KEK and re-wraps every active subject DEK under it.
     *
     * @param workspaceId the workspace whose KEK is being rotated
     * @param actorId     the user ID initiating the rotation (written to the audit log)
     * @return a summary of the rotation operation
     */
    @Transactional
    public RotationResult rotate(String workspaceId, String actorId) {
        WorkspaceSecuritySettings settings = securitySettings.get(workspaceId);

        log.info("[KEY-ROTATION] Starting KEK rotation for workspace={} provider={}", workspaceId, kmsProvider.name());

        // Rotate the workspace KEK; subsequent wrapDataKey calls wrap under the new KEK.
        String newKekRef = kmsProvider.rotateKek(workspaceId);

        // Re-wrap each active subject DEK under the new KEK. Unwrap with its stored keyRef (old KEK),
        // wrap again under the new one. The DEK — and the vault ciphertext under it — is unchanged.
        List<SubjectDataKey> keys = subjectKeys.findByWorkspaceId(workspaceId);
        int count = 0;
        OffsetDateTime now = OffsetDateTime.now();
        for (SubjectDataKey k : keys) {
            if (k.isShredded()) {
                continue;   // never resurrect a crypto-shredded subject
            }
            byte[] dek = kmsProvider.unwrapDataKey(workspaceId, k.getKeyRef(), k.getWrappedDek());
            try {
                KmsProvider.WrappedKey rewrapped = kmsProvider.wrapDataKey(workspaceId, dek);
                k.setWrappedDek(rewrapped.wrapped());
                k.setKeyRef(rewrapped.kekRef());
                k.setUpdatedAt(now);
                subjectKeys.save(k);
                count++;
            } finally {
                Arrays.fill(dek, (byte) 0);
            }
        }

        // Record the new KEK reference on the workspace security settings.
        settings.setByokKeyRef(newKekRef);
        settings.setUpdatedBy(actorId);
        settings.setUpdatedAt(now);
        securitySettings.update(workspaceId, actorId, settings);

        // Append to the tamper-evident audit chain (RB-40 §3 — every key change is auditable).
        String detail = "{\"kmsProvider\":\"" + kmsProvider.name()
            + "\",\"reWrappedSubjects\":" + count
            + ",\"newKeyRef\":\"" + newKekRef.replaceAll("\"", "'") + "\"}";
        auditLog.record(workspaceId, actorId, "KEY_ROTATED", "workspace", workspaceId, detail);

        log.info("[KEY-ROTATION] Completed rotation for workspace={} reWrappedSubjects={}", workspaceId, count);
        return new RotationResult(workspaceId, newKekRef, count, kmsProvider.name(), now);
    }
}
