package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * A workspace's AI defaults — the model tier and data-boundary flags shown on the AI Control page
 * (RB-40 §2). One row per workspace; a missing row means the system defaults (Sonnet, block PII +
 * financial). Workspace-scoped (RB-40 §1): the workspace id is the primary key.
 */
@Entity
@Table(name = "ai_workspace_settings")
public class AiWorkspaceSettings {

    @Id
    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(name = "default_model_tier")
    private String defaultModelTier = "SONNET";

    @Column(name = "block_pii")
    private boolean blockPii = true;

    @Column(name = "block_financial")
    private boolean blockFinancial = true;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getDefaultModelTier() { return defaultModelTier; }
    public void setDefaultModelTier(String defaultModelTier) { this.defaultModelTier = defaultModelTier; }
    public boolean isBlockPii() { return blockPii; }
    public void setBlockPii(boolean blockPii) { this.blockPii = blockPii; }
    public boolean isBlockFinancial() { return blockFinancial; }
    public void setBlockFinancial(boolean blockFinancial) { this.blockFinancial = blockFinancial; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
