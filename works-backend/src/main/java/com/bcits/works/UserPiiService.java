package com.bcits.works;

import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * The User-identity ↔ PII-vault glue (RB-40 §3, EPIC-P1-pii-vault). Centralises how the internal
 * {@code users} table's display PII (full name + email) is dual-written into, resolved from, and
 * crypto-shredded out of {@link PiiVaultService}, plus the email blind-index lookup
 * ({@link BlindIndexService}), so call sites never reach the vault directly and the dual-write /
 * read-switch / login-switch behaviour lives in one place.
 *
 * <p>User identity is global-by-design, so vault ops delegate to the {@code *Identity} helpers on
 * {@link PiiVaultService} (PLATFORM scope, system/unfiltered path).
 */
@Service
public class UserPiiService {

    private final PiiVaultService vault;
    private final PiiVaultPolicy policy;
    private final UserRepository users;
    private final BlindIndexService blindIndex;

    public UserPiiService(PiiVaultService vault, PiiVaultPolicy policy,
                          UserRepository users, BlindIndexService blindIndex) {
        this.vault = vault;
        this.policy = policy;
        this.users = users;
        this.blindIndex = blindIndex;
    }

    /**
     * Dual-write the user's identity PII (full name + email) into the vault. Call <b>after</b> the user
     * is saved (the subject token is minted by {@code User}'s {@code @PrePersist}). No-op when the vault
     * is disabled or the token is not yet present.
     */
    public void syncIdentity(User user) {
        if (!policy.isEnabled() || user == null || user.getSubjectToken() == null) {
            return;
        }
        vault.putIdentity(user.getSubjectToken(), PiiVaultService.TYPE_NAME, user.getFullName());
        vault.putIdentity(user.getSubjectToken(), PiiVaultService.TYPE_EMAIL, user.getEmail());
    }

    /** The blind index (keyed HMAC) of an email — set on {@code users.email_hmac} for login lookups. */
    public String emailHmac(String email) {
        return blindIndex.hmac(email);
    }

    /**
     * Resolve a user by email for authentication. Uses the blind index ({@code email_hmac}) when the
     * login-via-blind-index switch is on, else the legacy email column. The switch is off by default so
     * tokenization can ship without changing login behaviour until the backfill has populated every
     * user's {@code email_hmac}.
     */
    public Optional<User> resolveByEmail(String email) {
        if (policy.isLoginViaBlindIndex()) {
            return users.findByEmailHmac(blindIndex.hmac(email));
        }
        return users.findByEmail(email);
    }

    /**
     * The display name to render: the vault value when reads are switched on (or {@code "[erased]"} for
     * a crypto-shredded subject), else the legacy plaintext column. Falls back to the legacy column if
     * the vault has no entry yet (dual-write still in progress).
     */
    public String displayName(User user) {
        return display(user, PiiVaultService.TYPE_NAME, user == null ? null : user.getFullName());
    }

    /** As {@link #displayName} but for the email address. */
    public String displayEmail(User user) {
        return display(user, PiiVaultService.TYPE_EMAIL, user == null ? null : user.getEmail());
    }

    private String display(User user, String piiType, String legacy) {
        if (user == null) {
            return null;
        }
        if (policy.isReadFromVault() && user.getSubjectToken() != null) {
            return vault.resolveIdentity(user.getSubjectToken(), piiType).orElse(legacy);
        }
        return legacy;
    }

    /**
     * Crypto-shred the user's identity PII: destroy the per-subject DEK + vault rows. The legacy
     * plaintext columns (still authoritative during the dual-write window) are cleared separately by
     * {@link DataPrivacyService#erase}.
     */
    public void forgetIdentity(User user) {
        if (user != null && user.getSubjectToken() != null) {
            vault.forgetIdentity(user.getSubjectToken());
        }
    }
}
