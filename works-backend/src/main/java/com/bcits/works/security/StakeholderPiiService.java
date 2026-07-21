package com.bcits.works.security;

import com.bcits.works.Stakeholder;
import com.bcits.works.shared.PiiVaultPolicy;
import com.bcits.works.shared.PiiVaultService;
import com.bcits.works.shared.TenantScope;

import org.springframework.stereotype.Service;

/**
 * The Stakeholder ↔ PII-vault glue (RB-40 §3, EPIC-P1-pii-vault Slice 3). A stakeholder is often a
 * non-user (regulator, executive, partner); its structured PII (name, email, organization) and its
 * free-text {@code notes} are tokenized into the per-subject crypto-shred vault, addressed by
 * {@code Stakeholder.subjectToken}. Stakeholders are workspace-owned, so vault ops use the entity's
 * real {@code workspaceId} via the workspace-scoped {@link PiiVaultService}, run in the system scope
 * with that explicit workspace id (the tenant boundary). No login → no blind index.
 *
 * <p>Flag-gated like every other vault surface: dual-write on (default), read-from-vault off
 * (default) so the change is dormant until backfill + flip per environment.
 */
@Service
public class StakeholderPiiService {

    private final PiiVaultService vault;
    private final PiiVaultPolicy policy;

    public StakeholderPiiService(PiiVaultService vault, PiiVaultPolicy policy) {
        this.vault = vault;
        this.policy = policy;
    }

    /** Dual-write the stakeholder's PII (name, email, organization, notes) into the vault. Call after
     *  the row is saved (the subject token is minted by {@code Stakeholder}'s {@code @PrePersist}). */
    public void sync(Stakeholder s) {
        if (!policy.isEnabled() || s == null || s.getSubjectToken() == null || s.getWorkspaceId() == null) {
            return;
        }
        String ws = s.getWorkspaceId();
        String token = s.getSubjectToken();
        TenantScope.runAsSystem(() -> {
            vault.put(ws, token, PiiVaultService.TYPE_NAME, s.getName());
            vault.put(ws, token, PiiVaultService.TYPE_EMAIL, s.getEmail());
            vault.put(ws, token, PiiVaultService.TYPE_ORG, s.getOrganization());
            vault.put(ws, token, PiiVaultService.TYPE_NOTES, s.getNotes());
        });
    }

    /**
     * Replace the entity's PII fields with the resolved vault values in place (the entity is serialized
     * directly by {@link StakeholderController}). {@code "[erased]"} after a crypto-shred. No-op unless
     * reads are switched to the vault; falls back to the legacy column while dual-write is in progress.
     */
    public Stakeholder applyDisplay(Stakeholder s) {
        if (s == null || !policy.isReadFromVault() || s.getSubjectToken() == null || s.getWorkspaceId() == null) {
            return s;
        }
        String ws = s.getWorkspaceId();
        String token = s.getSubjectToken();
        TenantScope.runAsSystem(() -> {
            s.setName(vault.resolve(ws, token, PiiVaultService.TYPE_NAME).orElse(s.getName()));
            s.setEmail(vault.resolve(ws, token, PiiVaultService.TYPE_EMAIL).orElse(s.getEmail()));
            s.setOrganization(vault.resolve(ws, token, PiiVaultService.TYPE_ORG).orElse(s.getOrganization()));
            s.setNotes(vault.resolve(ws, token, PiiVaultService.TYPE_NOTES).orElse(s.getNotes()));
        });
        return s;
    }

    /** Crypto-shred the stakeholder's PII: destroy the per-subject DEK + vault rows. */
    public void forget(Stakeholder s) {
        if (s != null && s.getSubjectToken() != null && s.getWorkspaceId() != null) {
            String ws = s.getWorkspaceId();
            String token = s.getSubjectToken();
            TenantScope.runAsSystem(() -> vault.forget(ws, token));
        }
    }
}
