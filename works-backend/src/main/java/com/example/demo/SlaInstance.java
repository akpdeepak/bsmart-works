package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * A live SLA clock on a work item, for one {@link SlaTarget} (iteration 8, Cap M). It accrues
 * business minutes ({@code elapsedMinutes}) while {@code state} is RUNNING, freezes while PAUSED,
 * and settles to MET, BREACHED, or STOPPED. {@code dueAt} is the projected breach deadline in
 * wall-clock time, used to drive the visible countdown. {@code escalatedSteps} is a JSON array of
 * already-fired escalation ids so each step fires at most once (idempotency). The lifecycle is also
 * mirrored to the append-only {@code events} table, which is the audit log's source of truth.
 */
@Entity
@Table(name = "sla_instances")
public class SlaInstance {

    @Id
    private String id;
    private String workspaceId;
    private String workItemId;
    private String policyId;
    private String targetId;
    private String metric;
    private String state = "RUNNING";
    private Integer targetMinutes;
    private Integer elapsedMinutes = 0;
    private OffsetDateTime startedAt;
    private OffsetDateTime lastResumedAt;
    private OffsetDateTime pausedAt;
    private OffsetDateTime dueAt;
    private OffsetDateTime breachedAt;
    private OffsetDateTime completedAt;
    @Column(name = "escalated_steps", columnDefinition = "jsonb")
    private String escalatedSteps = "[]";
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getWorkItemId() { return workItemId; }
    public void setWorkItemId(String workItemId) { this.workItemId = workItemId; }
    public String getPolicyId() { return policyId; }
    public void setPolicyId(String policyId) { this.policyId = policyId; }
    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }
    public String getMetric() { return metric; }
    public void setMetric(String metric) { this.metric = metric; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public Integer getTargetMinutes() { return targetMinutes; }
    public void setTargetMinutes(Integer targetMinutes) { this.targetMinutes = targetMinutes; }
    public Integer getElapsedMinutes() { return elapsedMinutes; }
    public void setElapsedMinutes(Integer elapsedMinutes) { this.elapsedMinutes = elapsedMinutes; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }
    public OffsetDateTime getLastResumedAt() { return lastResumedAt; }
    public void setLastResumedAt(OffsetDateTime lastResumedAt) { this.lastResumedAt = lastResumedAt; }
    public OffsetDateTime getPausedAt() { return pausedAt; }
    public void setPausedAt(OffsetDateTime pausedAt) { this.pausedAt = pausedAt; }
    public OffsetDateTime getDueAt() { return dueAt; }
    public void setDueAt(OffsetDateTime dueAt) { this.dueAt = dueAt; }
    public OffsetDateTime getBreachedAt() { return breachedAt; }
    public void setBreachedAt(OffsetDateTime breachedAt) { this.breachedAt = breachedAt; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime completedAt) { this.completedAt = completedAt; }
    public String getEscalatedSteps() { return escalatedSteps; }
    public void setEscalatedSteps(String escalatedSteps) { this.escalatedSteps = escalatedSteps; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
