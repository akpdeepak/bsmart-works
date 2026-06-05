package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * Per-workspace KPI privacy policy (iteration 12, Cap L customization point). A workspace may set a
 * <em>stricter-than-default</em> policy: a larger {@code minAggregationSize} (more contributors
 * required before an aggregated metric is published) and the locked-by-design individual-comparison
 * flag. Absent a row, {@link KpiPrivacyService#DEFAULT_MIN_AGGREGATION_SIZE} applies.
 */
@Entity
@Table(name = "workspace_kpi_settings")
public class WorkspaceKpiSettings {

    @Id
    private String workspaceId;
    private Integer minAggregationSize = 3;
    private Boolean individualComparisonLocked = Boolean.TRUE;
    private OffsetDateTime updatedAt;

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public Integer getMinAggregationSize() { return minAggregationSize; }
    public void setMinAggregationSize(Integer minAggregationSize) { this.minAggregationSize = minAggregationSize; }
    public Boolean getIndividualComparisonLocked() { return individualComparisonLocked; }
    public void setIndividualComparisonLocked(Boolean individualComparisonLocked) {
        this.individualComparisonLocked = individualComparisonLocked;
    }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
