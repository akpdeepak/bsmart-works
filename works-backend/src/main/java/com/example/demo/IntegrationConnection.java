package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * A configured integration (iteration 13, Cap Q / Cap A): Slack, GitHub, GitLab, email, calendar, or
 * an SSO/SCIM identity provider. {@code config} holds the provider-specific settings validated
 * against {@link IntegrationCatalog}. Workspace-scoped (RB-40 §1).
 */
@Entity
@Table(name = "integration_connections")
public class IntegrationConnection {

    @Id
    private String id;
    private String workspaceId;
    @NotBlank
    private String provider;        // SLACK | GITHUB | GITLAB | EMAIL | CALENDAR | SAML | OIDC | SCIM
    @NotBlank
    private String name;
    @Column(columnDefinition = "jsonb")
    private String config = "{}";
    private String status = "CONNECTED";
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getConfig() { return config; }
    public void setConfig(String config) { this.config = config; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
