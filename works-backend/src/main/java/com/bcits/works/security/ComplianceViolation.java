package com.bcits.works.security;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * A compliance violation (iteration 7, Cap K): a work item in a rule's scope that fails the
 * rule's assertion. Created by {@link ComplianceEvaluationService}, it moves through a
 * lifecycle — OPEN → ACKNOWLEDGED → RESOLVED / WONT_FIX — and is auto-resolved when the item
 * starts passing again. Every transition is recorded as an event (RB-10 §3) so the compliance
 * audit log is reconstructable. Workspace/project are denormalized from the rule for
 * tenant-scoped reads (RB-40 §1).
 */
@Entity
@Table(name = "compliance_violations")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class ComplianceViolation {

    @Id
    private String id;
    @Column(name = "rule_id")
    private String ruleId;
    private String workspaceId;
    private String projectId;
    @Column(name = "work_item_id")
    private String workItemId;
    @Column(name = "work_item_title", columnDefinition = "TEXT")
    private String workItemTitle;
    private String severity = "MEDIUM";
    private String status = "OPEN";        // OPEN | ACKNOWLEDGED | RESOLVED | WONT_FIX
    private String resolution;             // AUTO_RESOLVED | MANUAL | WONT_FIX
    private OffsetDateTime detectedAt;
    private OffsetDateTime acknowledgedAt;
    private String acknowledgedBy;
    private OffsetDateTime resolvedAt;
    private String resolvedBy;
    @Column(columnDefinition = "TEXT")
    private String note;
    private Boolean escalated = false;
    private OffsetDateTime escalatedAt;
    @Column(name = "next_escalation_step")
    private Integer nextEscalationStep = 0;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getWorkItemId() { return workItemId; }
    public void setWorkItemId(String workItemId) { this.workItemId = workItemId; }
    public String getWorkItemTitle() { return workItemTitle; }
    public void setWorkItemTitle(String workItemTitle) { this.workItemTitle = workItemTitle; }
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getResolution() { return resolution; }
    public void setResolution(String resolution) { this.resolution = resolution; }
    public OffsetDateTime getDetectedAt() { return detectedAt; }
    public void setDetectedAt(OffsetDateTime detectedAt) { this.detectedAt = detectedAt; }
    public OffsetDateTime getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(OffsetDateTime acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }
    public String getAcknowledgedBy() { return acknowledgedBy; }
    public void setAcknowledgedBy(String acknowledgedBy) { this.acknowledgedBy = acknowledgedBy; }
    public OffsetDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(OffsetDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Boolean getEscalated() { return escalated; }
    public void setEscalated(Boolean escalated) { this.escalated = escalated; }
    public OffsetDateTime getEscalatedAt() { return escalatedAt; }
    public void setEscalatedAt(OffsetDateTime escalatedAt) { this.escalatedAt = escalatedAt; }
    public Integer getNextEscalationStep() { return nextEscalationStep; }
    public void setNextEscalationStep(Integer nextEscalationStep) { this.nextEscalationStep = nextEscalationStep; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
