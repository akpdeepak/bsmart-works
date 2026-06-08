package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * A KPI metric definition (iteration 12, Cap L). Built-in catalog metrics are seeded from
 * {@link MetricCatalog}; custom metrics are composed via the safe formula builder
 * ({@link MetricFormula}) — aggregate primitives only, never raw SQL — and may never target the
 * INDIVIDUAL scope (RB-40 §1 privacy guardrail).
 */
@Entity
@Table(name = "metric_definitions")
public class MetricDefinition {

    @Id
    private String id;
    private String workspaceId;
    @NotBlank
    private String metricKey;
    @NotBlank
    private String name;
    @Column(columnDefinition = "TEXT")
    private String description;
    private String primitive = "AVG";       // SUM | AVG | PERCENTILE | COUNT | RATIO
    private String sourceField;
    private String unit;
    private String scopeLevel = "TEAM";     // TEAM | PROJECT | ORG (never INDIVIDUAL)
    private Boolean higherIsBetter = true;
    private Boolean builtIn = false;
    private Double target;           // optional numeric target; drives ON_TRACK/AT_RISK/OFF_TRACK evaluation
    @Column(columnDefinition = "TEXT")
    private String bqlFormula;       // optional BQL expression (unification layer: one query language, RB-10 §6)
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
    public String getPrimitive() { return primitive; }
    public void setPrimitive(String primitive) { this.primitive = primitive; }
    public String getSourceField() { return sourceField; }
    public void setSourceField(String sourceField) { this.sourceField = sourceField; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getScopeLevel() { return scopeLevel; }
    public void setScopeLevel(String scopeLevel) { this.scopeLevel = scopeLevel; }
    public Boolean getHigherIsBetter() { return higherIsBetter; }
    public void setHigherIsBetter(Boolean higherIsBetter) { this.higherIsBetter = higherIsBetter; }
    public Boolean getBuiltIn() { return builtIn; }
    public void setBuiltIn(Boolean builtIn) { this.builtIn = builtIn; }
    public Double getTarget() { return target; }
    public void setTarget(Double target) { this.target = target; }
    public String getBqlFormula() { return bqlFormula; }
    public void setBqlFormula(String bqlFormula) { this.bqlFormula = bqlFormula; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
