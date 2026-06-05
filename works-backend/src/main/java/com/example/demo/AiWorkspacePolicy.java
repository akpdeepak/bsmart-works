package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * Workspace AI policy (iteration 10, Cap Z) — the top of the scope hierarchy (RB-40 §2). One row
 * per workspace. {@code mode} is ENABLED (AI on by default), DISABLED (off everywhere downstream),
 * or OPT_IN (off until a user opts in); {@code defaultModelTier} is the capable tier used while the
 * workspace is under budget. Admin-controlled via {@code manage_ai}.
 */
@Entity
@Table(name = "ai_workspace_policies")
public class AiWorkspacePolicy {

    @Id
    private String workspaceId;
    private String mode = "OPT_IN";
    private String defaultModelTier = "SONNET";
    private String updatedBy;
    private OffsetDateTime updatedAt;

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
    public String getDefaultModelTier() { return defaultModelTier; }
    public void setDefaultModelTier(String defaultModelTier) { this.defaultModelTier = defaultModelTier; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
