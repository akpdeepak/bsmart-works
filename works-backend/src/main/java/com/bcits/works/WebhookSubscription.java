package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * An outbound webhook subscription (iteration 13, Cap Q): deliver workspace events to an external
 * URL, signed with {@code secret}. {@code eventType} may be a specific type or {@code *} for all.
 * Workspace-scoped (RB-40 §1).
 */
@Entity
@Table(name = "webhook_subscriptions")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class WebhookSubscription {

    @Id
    private String id;
    private String workspaceId;
    @NotBlank
    private String eventType;
    @NotBlank
    private String targetUrl;
    private String secret;
    private Boolean active = true;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getTargetUrl() { return targetUrl; }
    public void setTargetUrl(String targetUrl) { this.targetUrl = targetUrl; }
    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
