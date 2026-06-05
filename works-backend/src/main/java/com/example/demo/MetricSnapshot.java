package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * An immutable per-period metric value (iteration 12, Cap L). One row = one metric, for one
 * aggregated scope (TEAM/PROJECT/ORG — never an individual), over one period. Snapshots are
 * <strong>append-only</strong>: there is no update path in the code, so historical metrics never
 * change retroactively and the series is audit-safe (RB-20 §5). A {@code suppressed} row carries a
 * null value because too few contributors stood behind it to publish anonymously (privacy floor).
 */
@Entity
@Table(name = "metric_snapshots")
public class MetricSnapshot {

    @Id
    private String id;
    private String workspaceId;
    @Column(name = "metric_key")
    private String metricKey;
    private String scope;            // TEAM | PROJECT | ORG
    private String scopeRef;         // teamId / projectId; null for ORG
    private String periodLabel;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private Double value;            // null = suppressed
    private Integer sampleSize = 0;
    private Boolean suppressed = Boolean.FALSE;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getMetricKey() { return metricKey; }
    public void setMetricKey(String metricKey) { this.metricKey = metricKey; }
    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }
    public String getScopeRef() { return scopeRef; }
    public void setScopeRef(String scopeRef) { this.scopeRef = scopeRef; }
    public String getPeriodLabel() { return periodLabel; }
    public void setPeriodLabel(String periodLabel) { this.periodLabel = periodLabel; }
    public LocalDate getPeriodStart() { return periodStart; }
    public void setPeriodStart(LocalDate periodStart) { this.periodStart = periodStart; }
    public LocalDate getPeriodEnd() { return periodEnd; }
    public void setPeriodEnd(LocalDate periodEnd) { this.periodEnd = periodEnd; }
    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }
    public Integer getSampleSize() { return sampleSize; }
    public void setSampleSize(Integer sampleSize) { this.sampleSize = sampleSize; }
    public Boolean getSuppressed() { return suppressed; }
    public void setSuppressed(Boolean suppressed) { this.suppressed = suppressed; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
