package com.bcits.works.security.api;
import com.bcits.works.auth.api.UserPiiService;

import com.bcits.works.auth.api.CustomerUser;
import com.bcits.works.auth.api.CustomerUserRepository;
import com.bcits.works.shared.BlindIndexService;
import com.bcits.works.shared.PiiVaultPolicy;
import com.bcits.works.shared.PiiVaultService;
import com.bcits.works.shared.TenantScope;

import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * The CustomerUser-identity ↔ PII-vault glue (RB-40 §3, EPIC-P1-pii-vault Slice 3) — the customer-portal
 * analogue of {@link UserPiiService}. Customer-portal users are a SEPARATE identity from the internal
 * {@code users} table, so their email + display name get their own vault subject (addressed by
 * {@code CustomerUser.subjectToken}) and their own {@code email_hmac} blind index for portal login.
 *
 * <p>Unlike the internal {@code users} table (global-by-design, PLATFORM scope), customer users are
 * workspace-owned, so vault ops use the customer's real {@code workspaceId} via the workspace-scoped
 * {@link PiiVaultService#put}/{@link PiiVaultService#resolve}/{@link PiiVaultService#forget}. The
 * vault read/write is run in the system/unfiltered scope with that explicit {@code workspaceId} so it
 * is correct regardless of the ambient tenant filter (the explicit workspace id is the tenant
 * boundary, and every vault finder is workspace-scoped).
 *
 * <p>All behaviour is flag-gated exactly like Slice 2: dual-write on (default), read-from-vault off
 * (default), login-via-blind-index off (default) — so the change is dormant until an operator
 * backfills and flips, per environment.
 */
@Service
public class CustomerUserPiiService {

    private final PiiVaultService vault;
    private final PiiVaultPolicy policy;
    private final CustomerUserRepository customerUsers;
    private final BlindIndexService blindIndex;

    public CustomerUserPiiService(PiiVaultService vault, PiiVaultPolicy policy,
                                  CustomerUserRepository customerUsers, BlindIndexService blindIndex) {
        this.vault = vault;
        this.policy = policy;
        this.customerUsers = customerUsers;
        this.blindIndex = blindIndex;
    }

    /**
     * Dual-write the customer user's identity PII (email + display name) into the vault. Call
     * <b>after</b> the row is saved (the subject token is minted by {@code CustomerUser}'s
     * {@code @PrePersist}). No-op when the vault is disabled or the token/workspace is not yet present.
     */
    public void syncIdentity(CustomerUser cu) {
        if (!policy.isEnabled() || cu == null || cu.getSubjectToken() == null || cu.getWorkspaceId() == null) {
            return;
        }
        String ws = cu.getWorkspaceId();
        String token = cu.getSubjectToken();
        TenantScope.runAsSystem(() -> {
            vault.put(ws, token, PiiVaultService.TYPE_EMAIL, cu.getEmail());
            vault.put(ws, token, PiiVaultService.TYPE_NAME, cu.getDisplayName());
        });
    }

    /** The blind index (keyed HMAC) of an email — set on {@code customer_users.email_hmac}. */
    public String emailHmac(String email) {
        return blindIndex.hmac(email);
    }

    /**
     * Resolve a customer-portal user by email for login. Uses the blind index ({@code email_hmac})
     * when {@code pii.vault.login-via-blind-index} is on, else the legacy email column. Off by default
     * so portal login behaviour is unchanged until the backfill has populated every customer's
     * {@code email_hmac}. (The same switch governs internal-user login — flip it only after BOTH
     * {@code users} and {@code customer_users} are backfilled.)
     */
    public Optional<CustomerUser> resolveByEmail(String email) {
        if (policy.isLoginViaBlindIndex()) {
            return customerUsers.findByEmailHmac(blindIndex.hmac(email));
        }
        return customerUsers.findByEmailIgnoreCase(email);
    }

    /** Duplicate-email guard, routed through the blind index when the login switch is on. */
    public boolean existsByEmail(String email) {
        if (policy.isLoginViaBlindIndex()) {
            return customerUsers.existsByEmailHmac(blindIndex.hmac(email));
        }
        return customerUsers.existsByEmailIgnoreCase(email);
    }

    /** The display name to render: the vault value when reads are on (or {@code "[erased]"} after a
     *  shred), else the legacy column. Falls back to the legacy column while dual-write is in progress. */
    public String displayName(CustomerUser cu) {
        return display(cu, PiiVaultService.TYPE_NAME, cu == null ? null : cu.getDisplayName());
    }

    /** As {@link #displayName} but for the email address. */
    public String displayEmail(CustomerUser cu) {
        return display(cu, PiiVaultService.TYPE_EMAIL, cu == null ? null : cu.getEmail());
    }

    /**
     * Replace the entity's display PII with the resolved values in place (for surfaces that serialize
     * the {@link CustomerUser} entity directly, mirroring the existing {@code scrub()} precedent).
     * No-op unless reads are switched to the vault.
     */
    public CustomerUser applyDisplay(CustomerUser cu) {
        if (cu != null && policy.isReadFromVault() && cu.getSubjectToken() != null) {
            cu.setEmail(displayEmail(cu));
            cu.setDisplayName(displayName(cu));
        }
        return cu;
    }

    private String display(CustomerUser cu, String piiType, String legacy) {
        if (cu == null) {
            return null;
        }
        if (policy.isReadFromVault() && cu.getSubjectToken() != null && cu.getWorkspaceId() != null) {
            String ws = cu.getWorkspaceId();
            String token = cu.getSubjectToken();
            return TenantScope.callAsSystem(() -> vault.resolve(ws, token, piiType).orElse(legacy));
        }
        return legacy;
    }

    /**
     * Crypto-shred the customer user's identity PII: destroy the per-subject DEK + vault rows. The
     * legacy plaintext columns (authoritative during the dual-write window) are the caller's concern.
     */
    public void forgetIdentity(CustomerUser cu) {
        if (cu != null && cu.getSubjectToken() != null && cu.getWorkspaceId() != null) {
            String ws = cu.getWorkspaceId();
            String token = cu.getSubjectToken();
            TenantScope.runAsSystem(() -> vault.forget(ws, token));
        }
    }
}
