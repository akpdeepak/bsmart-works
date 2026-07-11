package com.bcits.works.shared;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Runtime policy for the PII vault rollout (RB-40 §3, EPIC-P1-pii-vault). Two independent switches
 * drive the expand → backfill → switch → contract sequence safely:
 *
 * <ul>
 *   <li><b>enabled</b> — dual-write personal data into the per-subject crypto-shred vault on every
 *       write + backfill. Default on.</li>
 *   <li><b>readFromVault</b> — resolve display PII from the vault instead of the legacy plaintext
 *       column. Default <b>off</b> so the legacy column stays authoritative during the dual-write
 *       window (rollback is just flipping this back, with zero data loss). Flip per-environment once
 *       the vault is proven; the CONTRACT migration that drops the plaintext columns is deferred
 *       (EPIC §3/§12, Deepak decision 2026-06-20).</li>
 * </ul>
 */
@Component
public class PiiVaultPolicy {

    private final boolean enabled;
    private final boolean readFromVault;
    private final boolean loginViaBlindIndex;

    public PiiVaultPolicy(@Value("${pii.vault.enabled:true}") boolean enabled,
                          @Value("${pii.vault.read-from-vault:false}") boolean readFromVault,
                          @Value("${pii.vault.login-via-blind-index:false}") boolean loginViaBlindIndex) {
        this.enabled = enabled;
        this.readFromVault = readFromVault;
        this.loginViaBlindIndex = loginViaBlindIndex;
    }

    /** Dual-write PII into the vault on writes/backfill. */
    public boolean isEnabled() {
        return enabled;
    }

    /** Resolve display PII from the vault rather than the legacy plaintext column. */
    public boolean isReadFromVault() {
        return readFromVault;
    }

    /** Resolve users by the email blind index instead of the raw email column. */
    public boolean isLoginViaBlindIndex() {
        return loginViaBlindIndex;
    }
}
