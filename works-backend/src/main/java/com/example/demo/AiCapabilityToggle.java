package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * Per-capability AI toggle (iteration 10, Cap Z) — an explicit override for one capability within a
 * workspace (e.g. AI off for compliance, on for story drafting). Absence of a row means "inherit
 * the workspace policy". Admin-controlled via {@code manage_ai}; sits between workspace and user in
 * the most-restrictive-wins hierarchy (RB-40 §2).
 */
@Entity
@Table(name = "ai_capability_toggles")
public class AiCapabilityToggle {

    @Id
    private String id;
    private String workspaceId;
    private String capability;
    private Boolean enabled = true;
    private String updatedBy;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getCapability() { return capability; }
    public void setCapability(String capability) { this.capability = capability; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
