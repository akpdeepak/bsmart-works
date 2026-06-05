package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * An immutable per-period metric value (iteration 12, Cap L). Snapshots are append-only — once
 * written they are never updated, so historical metrics never change retroactively (audit-safe,
 * RB-20 §5). The INDIVIDUAL scope is permitted here for a user's own private history; it is never
 * exposed to another user except through an explicit {@link MetricShare} (RB-40 §1).
 */
@Entity
@Table(name = "metric_snapshots")
public class MetricSnapshot {

    @Id
    private String id;
    private String workspaceId;
    private String metricKey;
    private String scopeLevel;      // TEAM | PROJECT | ORG | INDIVIDUAL
    private String scopeId;         // team / project / user id; null for ORG
    private String period;
    private Double value = 0.0;
    private Integer sampleSize = 0;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getMetricKey() { return metricKey; }
    public void setMetricKey(String metricKey) { this.metricKey = metricKey; }
    public String getScopeLevel() { return scopeLevel; }
    public void setScopeLevel(String scopeLevel) { this.scopeLevel = scopeLevel; }
    public String getScopeId() { return scopeId; }
    public void setScopeId(String scopeId) { this.scopeId = scopeId; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }
    public Integer getSampleSize() { return sampleSize; }
    public void setSampleSize(Integer sampleSize) { this.sampleSize = sampleSize; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
