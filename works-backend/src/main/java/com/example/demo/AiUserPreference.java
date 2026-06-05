package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * Per-user AI preference (iteration 10, Cap Z) — a user toggles AI for themselves within the admin
 * policy bounds (RB-40 §2). Absence of a row means "inherit". This is the only AI-plane setting a
 * non-admin may change, and only for their own user id; it never relaxes a workspace/capability
 * that is off (most-restrictive-wins).
 */
@Entity
@Table(name = "ai_user_preferences")
public class AiUserPreference {

    @Id
    private String id;
    private String workspaceId;
    private String userId;
    private Boolean enabled = true;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
