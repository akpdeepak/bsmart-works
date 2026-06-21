package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * One-shot, idempotent backfill of the PII vault for existing users (RB-40 §3, EPIC §3 / §11.d —
 * "guarded one-shot service job", Deepak-approved 2026-06-20). Assigns a subject token and
 * dual-writes the display name into the vault for every user that does not yet have one. Safe to
 * re-run: already-tokenized users are skipped (the {@code subject_token IS NULL} finder is the guard).
 * New users created after V110 get their token via {@code User}'s {@code @PrePersist} and their vault
 * entry via {@link UserPiiService#syncName} at the write sites, so they never need this job.
 *
 * <p>Runs in the system/unfiltered scope (user identity is global-by-design).
 */
@Service
public class PiiVaultBackfillService {

    private static final Logger log = LoggerFactory.getLogger(PiiVaultBackfillService.class);

    private final UserRepository users;
    private final UserPiiService userPii;
    private final PiiVaultService vault;

    public PiiVaultBackfillService(UserRepository users, UserPiiService userPii, PiiVaultService vault) {
        this.users = users;
        this.userPii = userPii;
        this.vault = vault;
    }

    /** Backfill all users lacking a subject token. Returns how many were backfilled. Idempotent. */
    @Transactional
    public int backfillUserNames() {
        return TenantScope.callAsSystem(() -> {
            List<User> pending = users.findBySubjectTokenIsNull();
            int n = 0;
            for (User u : pending) {
                u.setSubjectToken(vault.mintSubjectToken());
                u.setEmailHmac(userPii.emailHmac(u.getEmail())); // blind index for tokenized login (RB-40 §3)
                users.save(u);
                userPii.syncIdentity(u); // vault name + email
                n++;
            }
            if (n > 0) {
                log.info("[PII-BACKFILL] Assigned subject tokens + vaulted names for {} user(s)", n);
            }
            return n;
        });
    }
}
