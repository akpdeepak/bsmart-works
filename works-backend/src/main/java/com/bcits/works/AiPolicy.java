package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * One node in the AI scope hierarchy (RB-40 §2). Policies resolve most-restrictive-wins across
 * WORKSPACE → CAPABILITY → USER (the 4th, in-context, scope is request-time only and never
 * persisted). A missing row means "inherit"; a row with {@code enabled=false} at any scope turns
 * AI off for everything downstream of it.
 */
@Entity
@Table(name = "ai_policies")
public class AiPolicy {

    @Id
    private String id;
    private String workspaceId;
    private String scopeType;   // WORKSPACE | CAPABILITY | USER
    private String capability;  // null for WORKSPACE / USER-wide scope
    private String userId;      // null unless USER scope
    private Boolean enabled = true;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getScopeType() { return scopeType; }
    public void setScopeType(String scopeType) { this.scopeType = scopeType; }
    public String getCapability() { return capability; }
    public void setCapability(String capability) { this.capability = capability; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
