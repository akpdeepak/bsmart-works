package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;

/**
 * One SLA target within a policy (iteration 8, Cap M — multiple targets per policy).
 * {@code startStatus} null means the clock starts when the policy is applied / the item
 * is created; {@code stopStatus} is a comma-separated list of statuses that fulfil it.
 */
@Entity
@Table(name = "sla_targets")
public class SlaTarget {

    @Id
    private String id;
    private String policyId;
    private String workspaceId;
    private String metric = "RESOLUTION";
    @NotBlank
    private String name;
    private Integer targetMinutes;
    private String startStatus;
    private String stopStatus = "Done";
    private Integer sortOrder = 0;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPolicyId() { return policyId; }
    public void setPolicyId(String policyId) { this.policyId = policyId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getMetric() { return metric; }
    public void setMetric(String metric) { this.metric = metric; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getTargetMinutes() { return targetMinutes; }
    public void setTargetMinutes(Integer targetMinutes) { this.targetMinutes = targetMinutes; }
    public String getStartStatus() { return startStatus; }
    public void setStartStatus(String startStatus) { this.startStatus = startStatus; }
    public String getStopStatus() { return stopStatus; }
    public void setStopStatus(String stopStatus) { this.stopStatus = stopStatus; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
