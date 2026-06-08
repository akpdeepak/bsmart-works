package com.example.demo;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

/**
 * B21: A SCIM 2.0 provisioning token (iteration 20, Cap T). One token authenticates one IdP
 * integration per workspace. The raw token is shown once at creation and never stored; only its
 * hash is persisted here (RB-40 §4 — credentials at rest are never plaintext).
 */
@Entity
@Table(name = "scim_tokens")
public class ScimToken {

    @Id
    private String id;
    private String workspaceId;
    private String tokenHash;   // SHA-256 hex of the raw bearer token
    private String label;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime lastUsedAt;
    private OffsetDateTime revokedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getLastUsedAt() { return lastUsedAt; }
    public void setLastUsedAt(OffsetDateTime lastUsedAt) { this.lastUsedAt = lastUsedAt; }
    public OffsetDateTime getRevokedAt() { return revokedAt; }
    public void setRevokedAt(OffsetDateTime revokedAt) { this.revokedAt = revokedAt; }
}
