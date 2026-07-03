package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * Encrypted OAuth tokens for a live integration connector (B23, iteration 13).
 * One row per (workspace_id, provider). Tokens are AES-256-GCM encrypted via
 * {@link EncryptionService} — raw access/refresh tokens never appear in DB plaintext.
 * Workspace-scoped (RB-40 §1).
 */
@Entity
@Table(name = "integration_credentials")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class IntegrationCredential {

    @Id
    private String id;

    @Column(name = "workspace_id", nullable = false)
    private String workspaceId;

    @Column(nullable = false)
    private String provider;

    @Column(name = "access_token_enc")
    private String accessTokenEnc;

    @Column(name = "refresh_token_enc")
    private String refreshTokenEnc;

    @Column(name = "token_type")
    private String tokenType = "Bearer";

    private String scopes;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getAccessTokenEnc() { return accessTokenEnc; }
    public void setAccessTokenEnc(String accessTokenEnc) { this.accessTokenEnc = accessTokenEnc; }

    public String getRefreshTokenEnc() { return refreshTokenEnc; }
    public void setRefreshTokenEnc(String refreshTokenEnc) { this.refreshTokenEnc = refreshTokenEnc; }

    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }

    public String getScopes() { return scopes; }
    public void setScopes(String scopes) { this.scopes = scopes; }

    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime expiresAt) { this.expiresAt = expiresAt; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
