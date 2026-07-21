package com.bcits.works.projects;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * Cap W · OKR linkage (I15-S12). A measurable key result under an {@link Objective}. Hard-deleted
 * (no deletedAt) — it lives and dies with its objective via the ON DELETE CASCADE FK.
 */
@Entity
@Table(name = "key_results")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class KeyResult {
    @Id private String id;
    private String objectiveId;
    private String workspaceId;
    @NotBlank private String title;
    private String metricType = "PERCENT"; // PERCENT | NUMBER | CURRENCY | BOOLEAN
    private double startValue = 0;
    private double targetValue = 100;
    private double currentValue = 0;
    private String status = "ON_TRACK";
    private int displayOrder = 0;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getObjectiveId() { return objectiveId; }
    public void setObjectiveId(String objectiveId) { this.objectiveId = objectiveId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMetricType() { return metricType; }
    public void setMetricType(String metricType) { this.metricType = metricType; }
    public double getStartValue() { return startValue; }
    public void setStartValue(double startValue) { this.startValue = startValue; }
    public double getTargetValue() { return targetValue; }
    public void setTargetValue(double targetValue) { this.targetValue = targetValue; }
    public double getCurrentValue() { return currentValue; }
    public void setCurrentValue(double currentValue) { this.currentValue = currentValue; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
