package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * Data boundary controls (iteration 10, Cap Z) — which data types may leave the server to a model
 * (RB-40 §2). One row per workspace. When a flag is set, the matching fields are redacted
 * server-side by {@link DataBoundaryService} before anything is sent to a provider. Defaults are
 * conservative (block PII + financial), so a freshly-enabled workspace is private by default.
 */
@Entity
@Table(name = "ai_data_boundaries")
public class AiDataBoundary {

    @Id
    private String workspaceId;
    private Boolean blockPii = true;
    private Boolean blockFinancial = true;
    private String updatedBy;
    private OffsetDateTime updatedAt;

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public Boolean getBlockPii() { return blockPii; }
    public void setBlockPii(Boolean blockPii) { this.blockPii = blockPii; }
    public Boolean getBlockFinancial() { return blockFinancial; }
    public void setBlockFinancial(Boolean blockFinancial) { this.blockFinancial = blockFinancial; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
