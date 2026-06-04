package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * A running SLA clock for one (work item, target) pair (iteration 8, Cap M — countdown
 * timers, pause/resume). {@code consumedSeconds} freezes accumulated business-time at each
 * pause; {@code runningSince} anchors the clock while RUNNING; {@code dueAt} is the
 * recomputed absolute deadline. Lifecycle: PENDING → RUNNING ⇄ PAUSED → MET | BREACHED.
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
    private Integer targetMinutes;
    private String status = "PENDING";
    private OffsetDateTime startedAt;
    private OffsetDateTime runningSince;
    private OffsetDateTime pausedAt;
    private OffsetDateTime dueAt;
    private Long consumedSeconds = 0L;
    private OffsetDateTime completedAt;
    private OffsetDateTime breachedAt;
    private Integer lastEscalationPct = 0;
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
    public Integer getTargetMinutes() { return targetMinutes; }
    public void setTargetMinutes(Integer targetMinutes) { this.targetMinutes = targetMinutes; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }
    public OffsetDateTime getRunningSince() { return runningSince; }
    public void setRunningSince(OffsetDateTime runningSince) { this.runningSince = runningSince; }
    public OffsetDateTime getPausedAt() { return pausedAt; }
    public void setPausedAt(OffsetDateTime pausedAt) { this.pausedAt = pausedAt; }
    public OffsetDateTime getDueAt() { return dueAt; }
    public void setDueAt(OffsetDateTime dueAt) { this.dueAt = dueAt; }
    public Long getConsumedSeconds() { return consumedSeconds; }
    public void setConsumedSeconds(Long consumedSeconds) { this.consumedSeconds = consumedSeconds; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime completedAt) { this.completedAt = completedAt; }
    public OffsetDateTime getBreachedAt() { return breachedAt; }
    public void setBreachedAt(OffsetDateTime breachedAt) { this.breachedAt = breachedAt; }
    public Integer getLastEscalationPct() { return lastEscalationPct; }
    public void setLastEscalationPct(Integer lastEscalationPct) { this.lastEscalationPct = lastEscalationPct; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
