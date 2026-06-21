package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The single seam for personal data (RB-40 §3, EPIC-P1-pii-vault). Raw PII lives ONLY here —
 * encrypted under a per-subject data key (DEK) in {@link PiiVaultEntry}, addressed by an opaque
 * {@code subjectToken}. Every other table / event / projection / log references the token, never the
 * raw value. "Forget" destroys the subject's DEK ({@link SubjectDataKey}) and the vault rows, so the
 * personal data becomes cryptographically unrecoverable while the surrogate id + token survive
 * (crypto-shredding).
 *
 * <h2>Scoping</h2>
 * Every operation takes an explicit {@code workspaceId} (the {@link KeyRotationService} pattern) so it
 * is correct whether or not the central tenant filter is active. Workspace-owned subjects
 * (customer-portal users, stakeholders) use their real {@code workspaceId}. The internal {@code users}
 * table is <b>global-by-design</b> (not workspace-owned), so user identity is vaulted under the
 * reserved {@link #PLATFORM_SCOPE} and accessed through the {@code *Identity} helpers, which run in the
 * {@link TenantScope} system/unfiltered escape hatch — exactly how the {@code users} table itself is
 * read across the app.
 */
@Service
public class PiiVaultService {

    /** Reserved vault scope for global-by-design user identity (the {@code users} table). */
    public static final String PLATFORM_SCOPE = "PLATFORM";

    // pii_type taxonomy (mirrors V67: EMAIL | PHONE | NAME | ADDRESS | ...).
    public static final String TYPE_EMAIL = "EMAIL";
    public static final String TYPE_NAME = "NAME";

    /** What {@link #resolve} returns for a subject whose key has been crypto-shredded. */
    public static final String ERASED = "[erased]";

    private final PiiVaultRepository vault;
    private final SubjectDataKeyRepository keys;
    private final KmsProvider kms;
    private final EncryptionService encryption;
    private final SecureRandom rng = new SecureRandom();

    public PiiVaultService(PiiVaultRepository vault, SubjectDataKeyRepository keys,
                           KmsProvider kms, EncryptionService encryption) {
        this.vault = vault;
        this.keys = keys;
        this.kms = kms;
        this.encryption = encryption;
    }

    /** Mint a fresh opaque subject token (stored on the owning row, e.g. {@code users.subject_token}).
     *  Not derived from any PII (no rainbow-table risk). */
    public String mintSubjectToken() {
        return "subj-" + UUID.randomUUID();
    }

    // ── Workspace-scoped operations (customer-portal users, stakeholders) ───────────────────────

    /** Encrypt {@code value} under the subject's DEK and upsert it as the {@code piiType} vault row. */
    @Transactional
    public void put(String workspaceId, String subjectToken, String piiType, String value) {
        putCore(workspaceId, subjectToken, piiType, value);
    }

    /** Resolve the subject's {@code piiType} value: the plaintext, {@link #ERASED} when shredded, or
     *  empty when never vaulted. */
    @Transactional(readOnly = true)
    public Optional<String> resolve(String workspaceId, String subjectToken, String piiType) {
        return resolveCore(workspaceId, subjectToken, piiType);
    }

    /** Crypto-shred: destroy the subject's DEK and hard-delete its vault rows. Idempotent. */
    @Transactional
    public void forget(String workspaceId, String subjectToken) {
        forgetCore(workspaceId, subjectToken);
    }

    /** True once a subject has been crypto-shredded (short-circuits sends / derivations). */
    @Transactional(readOnly = true)
    public boolean isShredded(String workspaceId, String subjectToken) {
        return keys.findByWorkspaceIdAndSubjectId(workspaceId, subjectToken)
                .map(SubjectDataKey::isShredded).orElse(false);
    }

    // ── Global identity operations (User subject; PLATFORM scope via the system escape hatch) ────

    @Transactional
    public void putIdentity(String subjectToken, String piiType, String value) {
        TenantScope.runAsSystem(() -> putCore(PLATFORM_SCOPE, subjectToken, piiType, value));
    }

    @Transactional(readOnly = true)
    public Optional<String> resolveIdentity(String subjectToken, String piiType) {
        return TenantScope.callAsSystem(() -> resolveCore(PLATFORM_SCOPE, subjectToken, piiType));
    }

    @Transactional
    public void forgetIdentity(String subjectToken) {
        TenantScope.runAsSystem(() -> forgetCore(PLATFORM_SCOPE, subjectToken));
    }

    @Transactional(readOnly = true)
    public boolean isIdentityShredded(String subjectToken) {
        return Boolean.TRUE.equals(TenantScope.callAsSystem(() ->
                keys.findByWorkspaceIdAndSubjectId(PLATFORM_SCOPE, subjectToken)
                        .map(SubjectDataKey::isShredded).orElse(false)));
    }

    // ── core logic (plain; the public methods above own the @Transactional + scope) ─────────────

    private void putCore(String workspaceId, String subjectToken, String piiType, String value) {
        if (value == null) {
            return;
        }
        byte[] dek = ensureActiveDek(workspaceId, subjectToken);
        try {
            String ciphertext = encryption.encryptWith(dek, value);
            OffsetDateTime now = OffsetDateTime.now();
            PiiVaultEntry e = findEntry(workspaceId, subjectToken, piiType).orElseGet(() -> {
                PiiVaultEntry n = new PiiVaultEntry();
                n.setId("pii-" + UUID.randomUUID());
                n.setCreatedAt(now);
                return n;
            });
            e.setWorkspaceId(workspaceId);
            e.setSubjectId(subjectToken);
            e.setPiiType(piiType);
            e.setEncryptedValue(ciphertext);
            e.setKeyVersion(keys.findByWorkspaceIdAndSubjectId(workspaceId, subjectToken)
                    .map(SubjectDataKey::getKeyRef).orElse(null));
            e.setUpdatedAt(now);
            vault.save(e);
        } finally {
            Arrays.fill(dek, (byte) 0);
        }
    }

    private Optional<String> resolveCore(String workspaceId, String subjectToken, String piiType) {
        if (subjectToken == null) {
            return Optional.empty();
        }
        SubjectDataKey k = keys.findByWorkspaceIdAndSubjectId(workspaceId, subjectToken).orElse(null);
        if (k == null) {
            return Optional.empty();           // never vaulted
        }
        if (k.isShredded()) {
            return Optional.of(ERASED);        // crypto-shredded
        }
        Optional<PiiVaultEntry> entry = findEntry(workspaceId, subjectToken, piiType);
        if (entry.isEmpty()) {
            return Optional.empty();
        }
        byte[] dek = kms.unwrapDataKey(workspaceId, k.getKeyRef(), k.getWrappedDek());
        try {
            return Optional.of(encryption.decryptWith(dek, entry.get().getEncryptedValue()));
        } finally {
            Arrays.fill(dek, (byte) 0);
        }
    }

    private void forgetCore(String workspaceId, String subjectToken) {
        if (subjectToken == null) {
            return;
        }
        List<PiiVaultEntry> entries = vault.findByWorkspaceIdAndSubjectId(workspaceId, subjectToken);
        if (!entries.isEmpty()) {
            vault.deleteAll(entries);
        }
        keys.findByWorkspaceIdAndSubjectId(workspaceId, subjectToken).ifPresent(k -> {
            OffsetDateTime now = OffsetDateTime.now();
            k.setKeyState(SubjectDataKey.STATE_SHREDDED);
            k.setWrappedDek(null);
            k.setShreddedAt(now);
            k.setUpdatedAt(now);
            keys.save(k);
        });
    }

    private Optional<PiiVaultEntry> findEntry(String workspaceId, String subjectToken, String piiType) {
        return vault.findByWorkspaceIdAndSubjectId(workspaceId, subjectToken).stream()
                .filter(e -> piiType.equals(e.getPiiType()))
                .findFirst();
    }

    /** Return the subject's DEK, creating + wrapping a fresh one on first use. Throws if shredded. */
    private byte[] ensureActiveDek(String workspaceId, String subjectToken) {
        SubjectDataKey k = keys.findByWorkspaceIdAndSubjectId(workspaceId, subjectToken).orElse(null);
        if (k != null) {
            if (k.isShredded()) {
                throw new IllegalStateException(
                        "Cannot store PII for a crypto-shredded subject (" + subjectToken + ")");
            }
            return kms.unwrapDataKey(workspaceId, k.getKeyRef(), k.getWrappedDek());
        }
        byte[] dek = new byte[32];
        rng.nextBytes(dek);
        KmsProvider.WrappedKey wrapped = kms.wrapDataKey(workspaceId, dek);
        OffsetDateTime now = OffsetDateTime.now();
        SubjectDataKey nk = new SubjectDataKey();
        nk.setId("sdk-" + UUID.randomUUID());
        nk.setWorkspaceId(workspaceId);
        nk.setSubjectId(subjectToken);
        nk.setWrappedDek(wrapped.wrapped());
        nk.setKeyRef(wrapped.kekRef());
        nk.setKeyState(SubjectDataKey.STATE_ACTIVE);
        nk.setCreatedAt(now);
        nk.setUpdatedAt(now);
        keys.save(nk);
        return dek;
    }
}
