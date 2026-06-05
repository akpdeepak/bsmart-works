package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * A metric definition (iteration 12, Cap L) — the catalog entry behind the KPI framework.
 * A row with {@code workspaceId == null} is a global default-catalog template; a workspace-scoped
 * row is that workspace's own (cloned or custom) definition. Definitions are built from <em>safe
 * formula primitives</em> ({@code aggregation} + {@code source}), never raw SQL, and
 * {@link MetricFormulaService} validates that a definition cannot expose an individual breakdown.
 * Mirrors the {@code compliance_rules} / {@code reports} entity style.
 */
@Entity
@Table(name = "metric_definitions")
public class MetricDefinition {

    @Id
    private String id;
    private String workspaceId;                 // null = global default template
    @NotBlank
    @Column(name = "metric_key")
    private String metricKey;
    @NotBlank
    private String name;
    private String description;
    private String category = "FLOW";           // FLOW | THROUGHPUT | PREDICTABILITY | QUALITY
    private String aggregation = "AVG";         // SUM | AVG | PERCENTILE | COUNT | RATIO
    private String source;                      // computation source key the engine understands
    private String unit = "count";              // count | hours | days | points | percent
    private Integer percentile;                 // for aggregation = PERCENTILE
    private Boolean higherIsBetter = Boolean.TRUE;
    private String minLayer = "TEAM";           // least-aggregated layer allowed: PERSONAL | TEAM
    private Boolean isDefault = Boolean.FALSE;
    private Boolean active = Boolean.TRUE;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getMetricKey() { return metricKey; }
    public void setMetricKey(String metricKey) { this.metricKey = metricKey; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getAggregation() { return aggregation; }
    public void setAggregation(String aggregation) { this.aggregation = aggregation; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public Integer getPercentile() { return percentile; }
    public void setPercentile(Integer percentile) { this.percentile = percentile; }
    public Boolean getHigherIsBetter() { return higherIsBetter; }
    public void setHigherIsBetter(Boolean higherIsBetter) { this.higherIsBetter = higherIsBetter; }
    public String getMinLayer() { return minLayer; }
    public void setMinLayer(String minLayer) { this.minLayer = minLayer; }
    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
