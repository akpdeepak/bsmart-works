package com.bcits.works.security.api;

import com.bcits.works.shared.PiiVaultPolicy;
import com.bcits.works.shared.PiiVaultService;
import com.bcits.works.shared.TenantScope;

/**
 * Vault glue for the two persisted, denormalised free-text customer-attribution copies (RB-40 §3,
 * EPIC-P1-pii-vault Slice 3): {@code chat_conversations.customer_name} and
 * {@code customer_feedback_items.customer}. Unlike CustomerUser/Stakeholder these are not a structured
 * subject record but a single free-text value naming a customer, so each gets its own per-record
 * subject token and the literal value is tokenized into the vault under {@code TYPE_NAME}. The token
 * is stored on the owning row; the agent inbox / feedback list resolve it at render (and to
 * {@code "[erased]"} after a crypto-shred). The legacy plaintext column stays authoritative until the
 * deferred CONTRACT migration drops it.
 *
 * <p>Workspace-owned: vault ops use the owning row's {@code workspaceId}, run in the system scope with
 * that explicit workspace id (the tenant boundary). Flag-gated: dual-write on (default),
 * read-from-vault off (default).
 */
@org.springframework.stereotype.Service
public class CustomerAttributionPiiService {

    private final PiiVaultService vault;
    private final PiiVaultPolicy policy;

    public CustomerAttributionPiiService(PiiVaultService vault, PiiVaultPolicy policy) {
        this.vault = vault;
        this.policy = policy;
    }

    /**
     * Tokenize {@code value} into the vault and return the subject token to store on the owning row.
     * Reuses {@code existingToken} when present (an update), else mints a fresh per-record token. When
     * the vault is disabled or {@code value} is null/blank, returns {@code existingToken} unchanged so
     * nothing is vaulted and the legacy column remains the sole source.
     */
    public String ensureVaulted(String workspaceId, String existingToken, String value) {
        if (!policy.isEnabled() || workspaceId == null || value == null || value.isBlank()) {
            return existingToken;
        }
        String token = (existingToken == null || existingToken.isBlank())
                ? vault.mintSubjectToken() : existingToken;
        TenantScope.runAsSystem(() -> vault.put(workspaceId, token, PiiVaultService.TYPE_NAME, value));
        return token;
    }

    /**
     * The customer name to render: the vault value when reads are switched on (or {@code "[erased]"}
     * after a shred), else the legacy column value. Falls back to the legacy value while dual-write is
     * still in progress (no vault row yet).
     */
    public String resolve(String workspaceId, String token, String legacy) {
        if (!policy.isReadFromVault() || workspaceId == null || token == null) {
            return legacy;
        }
        return TenantScope.callAsSystem(() ->
                vault.resolve(workspaceId, token, PiiVaultService.TYPE_NAME).orElse(legacy));
    }

    /** Crypto-shred a per-record attribution token (destroy DEK + vault rows). */
    public void forget(String workspaceId, String token) {
        if (workspaceId != null && token != null) {
            TenantScope.runAsSystem(() -> vault.forget(workspaceId, token));
        }
    }
}
