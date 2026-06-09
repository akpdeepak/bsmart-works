package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.ColumnTransformer;

/**
 * A reusable configuration template (iteration 17, Cap R). Saving the current config as a template
 * makes it applicable to any new workspace — the basis for template-based customer onboarding.
 * {@code ownerWorkspaceId} is the authoring workspace (NULL for a BCITS-internal/global template);
 * {@code shareable} exposes it to every workspace's library, otherwise only the owner sees it.
 */
@Entity
@Table(name = "config_templates")
public class ConfigTemplate {

    @Id
    private String id;

    @Column(name = "owner_workspace_id")
    private String ownerWorkspaceId;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Boolean shareable = false;

    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb")
    private String document;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getOwnerWorkspaceId() { return ownerWorkspaceId; }
    public void setOwnerWorkspaceId(String ownerWorkspaceId) { this.ownerWorkspaceId = ownerWorkspaceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Boolean getShareable() { return shareable; }
    public void setShareable(Boolean shareable) { this.shareable = shareable; }
    public String getDocument() { return document; }
    public void setDocument(String document) { this.document = document; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
