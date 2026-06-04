package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * An SLA escalation step (iteration 8, Cap M). Fires when the consumed fraction of a
 * target crosses {@code thresholdPct} (100 = breach). {@code targetId} null applies the
 * step to every target in the policy. Action is NOTIFY (alert {@code notifyTo} users) or
 * REASSIGN (move the work item to {@code reassignTo}).
 */
@Entity
@Table(name = "sla_escalations")
public class SlaEscalation {

    @Id
    private String id;
    private String policyId;
    private String targetId;
    private String workspaceId;
    private Integer thresholdPct = 80;
    private String action = "NOTIFY";
    @Column(name = "notify_to", columnDefinition = "jsonb")
    private String notifyTo = "[]";
    private String reassignTo;
    private Integer sortOrder = 0;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPolicyId() { return policyId; }
    public void setPolicyId(String policyId) { this.policyId = policyId; }
    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public Integer getThresholdPct() { return thresholdPct; }
    public void setThresholdPct(Integer thresholdPct) { this.thresholdPct = thresholdPct; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getNotifyTo() { return notifyTo; }
    public void setNotifyTo(String notifyTo) { this.notifyTo = notifyTo; }
    public String getReassignTo() { return reassignTo; }
    public void setReassignTo(String reassignTo) { this.reassignTo = reassignTo; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
