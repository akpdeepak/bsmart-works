package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * An escalation step on a {@link SlaPolicy} (iteration 8, Cap M). Fires when a clock crosses
 * {@code thresholdPercent} of its budget (e.g. 80%) or, when {@code onBreach} is true, the moment
 * it breaches. The action is NOTIFY (route to {@code actionTarget}) or REASSIGN. {@code targetId}
 * null applies the step to every target of the policy. Multiple steps give the "escalate before,
 * not after" behaviour the spec calls for; the engine fires each step at most once per instance.
 */
@Entity
@Table(name = "sla_escalations")
public class SlaEscalation {

    @Id
    private String id;
    private String policyId;
    private String workspaceId;
    private String targetId;
    private Integer thresholdPercent;
    private Boolean onBreach = false;
    private String action = "NOTIFY";
    @Column(name = "action_target", columnDefinition = "jsonb")
    private String actionTarget = "[]";
    private Integer sortOrder = 0;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPolicyId() { return policyId; }
    public void setPolicyId(String policyId) { this.policyId = policyId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }
    public Integer getThresholdPercent() { return thresholdPercent; }
    public void setThresholdPercent(Integer thresholdPercent) { this.thresholdPercent = thresholdPercent; }
    public Boolean getOnBreach() { return onBreach; }
    public void setOnBreach(Boolean onBreach) { this.onBreach = onBreach; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getActionTarget() { return actionTarget; }
    public void setActionTarget(String actionTarget) { this.actionTarget = actionTarget; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
