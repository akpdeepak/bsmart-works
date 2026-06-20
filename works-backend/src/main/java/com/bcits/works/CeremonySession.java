package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * Cap V · Sprint ceremonies as first-class sessions. One shared shell for all five ceremony
 * types (STANDUP, PLANNING, REVIEW, RETRO, REFINEMENT) so every ceremony can be scheduled,
 * started, joined and completed — with per-member {@link CeremonyAttendee}. Standup and
 * retro keep their own mechanics underneath via standupSessionId / retroSessionId links.
 */
@Entity
@Table(name = "ceremony_sessions")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class CeremonySession {
    @Id private String id;
    private String workspaceId;
    @NotBlank private String projectId;
    private String sprintId;
    @NotBlank private String ceremonyType;   // STANDUP | PLANNING | REVIEW | RETRO | REFINEMENT
    private OffsetDateTime scheduledAt;
    private OffsetDateTime startedAt;
    private OffsetDateTime endedAt;
    private String status = "SCHEDULED";     // SCHEDULED | LIVE | COMPLETED | CANCELLED
    private String facilitatorId;
    private String standupSessionId;
    private String retroSessionId;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getSprintId() { return sprintId; }
    public void setSprintId(String sprintId) { this.sprintId = sprintId; }
    public String getCeremonyType() { return ceremonyType; }
    public void setCeremonyType(String ceremonyType) { this.ceremonyType = ceremonyType; }
    public OffsetDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(OffsetDateTime scheduledAt) { this.scheduledAt = scheduledAt; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }
    public OffsetDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(OffsetDateTime endedAt) { this.endedAt = endedAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getFacilitatorId() { return facilitatorId; }
    public void setFacilitatorId(String facilitatorId) { this.facilitatorId = facilitatorId; }
    public String getStandupSessionId() { return standupSessionId; }
    public void setStandupSessionId(String standupSessionId) { this.standupSessionId = standupSessionId; }
    public String getRetroSessionId() { return retroSessionId; }
    public void setRetroSessionId(String retroSessionId) { this.retroSessionId = retroSessionId; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
