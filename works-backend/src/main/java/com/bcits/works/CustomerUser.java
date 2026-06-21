package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * An external customer-portal user (iteration 9, Cap N) — a SEPARATE identity from the internal
 * {@code users} table, with its own login flow. Belongs to a {@link CustomerAccount} and is
 * tenant-scoped by {@code workspaceId}. Never granted internal workspace membership.
 *
 * <p>PII (email + display name) is tokenized into the per-subject crypto-shred vault (RB-40 §3,
 * EPIC-P1-pii-vault Slice 3): {@link #subjectToken} addresses the vault rows and {@link #emailHmac}
 * is the blind index that keeps portal login an O(1) lookup once the raw email is tokenized. The glue
 * lives in {@link CustomerUserPiiService}.
 */
@Entity
@Table(name = "customer_users")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class CustomerUser {

    /** Mint the opaque PII-vault subject token on first persist if absent (RB-40 §3). Format matches
     *  {@link PiiVaultService#mintSubjectToken()} so backfilled and freshly-created customers are uniform. */
    @PrePersist
    void assignSubjectToken() {
        if (subjectToken == null || subjectToken.isBlank()) {
            subjectToken = "subj-" + java.util.UUID.randomUUID();
        }
    }

    @Id
    private String id;
    private String customerAccountId;
    private String workspaceId;
    private String email;
    private String passwordHash;
    private String displayName;
    private Boolean isAccountAdmin = false;
    private Boolean active = true;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // Opaque per-subject token for the PII vault (RB-40 §3). Minted once via @PrePersist, stable for
    // the subject's lifetime, used as subject_id in pii_vault_entries / subject_data_keys.
    @Column(name = "subject_token")
    private String subjectToken;

    // Blind index of the normalized email — deterministic keyed HMAC for O(1) portal-login lookups
    // once the raw email is tokenized (RB-40 §3). Populated alongside subject_token. See BlindIndexService.
    @Column(name = "email_hmac")
    private String emailHmac;

    public String getSubjectToken() { return subjectToken; }
    public void setSubjectToken(String subjectToken) { this.subjectToken = subjectToken; }
    public String getEmailHmac() { return emailHmac; }
    public void setEmailHmac(String emailHmac) { this.emailHmac = emailHmac; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCustomerAccountId() { return customerAccountId; }
    public void setCustomerAccountId(String customerAccountId) { this.customerAccountId = customerAccountId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public Boolean getIsAccountAdmin() { return isAccountAdmin; }
    public void setIsAccountAdmin(Boolean isAccountAdmin) { this.isAccountAdmin = isAccountAdmin; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
