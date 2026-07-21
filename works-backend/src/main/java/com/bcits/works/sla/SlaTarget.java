package com.bcits.works.sla;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.Filter;

/**
 * One SLA target within a {@link SlaPolicy} (iteration 8, Cap M): a single business-minute budget
 * for a metric (FIRST_RESPONSE, RESOLUTION, or a custom name). The clock starts when the item
 * enters {@code startStatus} (null = as soon as it is in scope), pauses while the item sits in any
 * of {@code pauseStatuses} (e.g. "Waiting on customer"), and is met when the item reaches
 * {@code stopStatus}. A policy may carry several targets, evaluated independently.
 */
@Entity
@Table(name = "sla_targets")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class SlaTarget {

    @Id
    private String id;
    private String policyId;
    private String workspaceId;
    @NotBlank
    private String metric;
    @Positive
    private Integer targetMinutes;
    private String startStatus;
    private String stopStatus;
    @ColumnTransformer(write = "?::jsonb")
    @Column(name = "pause_statuses", columnDefinition = "jsonb")
    private String pauseStatuses = "[]";
    private Integer sortOrder = 0;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPolicyId() { return policyId; }
    public void setPolicyId(String policyId) { this.policyId = policyId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getMetric() { return metric; }
    public void setMetric(String metric) { this.metric = metric; }
    public Integer getTargetMinutes() { return targetMinutes; }
    public void setTargetMinutes(Integer targetMinutes) { this.targetMinutes = targetMinutes; }
    public String getStartStatus() { return startStatus; }
    public void setStartStatus(String startStatus) { this.startStatus = startStatus; }
    public String getStopStatus() { return stopStatus; }
    public void setStopStatus(String stopStatus) { this.stopStatus = stopStatus; }
    public String getPauseStatuses() { return pauseStatuses; }
    public void setPauseStatuses(String pauseStatuses) { this.pauseStatuses = pauseStatuses; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
