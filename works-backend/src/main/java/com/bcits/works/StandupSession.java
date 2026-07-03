package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * Cap V · Standup facilitator (I15-S02). A sequential, time-boxed per-member flow that auto-records
 * updates and flags missing members, so the daily standup lives in the Scrum Master cockpit.
 */
@Entity
@Table(name = "standup_sessions")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class StandupSession {
    @Id private String id;
    private String workspaceId;
    @NotBlank private String projectId;
    private String sprintId;
    private LocalDate sessionDate;
    private String status = "IN_PROGRESS";   // IN_PROGRESS | COMPLETED
    private int timeBoxMins = 2;
    private String currentMemberId;
    private String facilitatorId;
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
    public LocalDate getSessionDate() { return sessionDate; }
    public void setSessionDate(LocalDate sessionDate) { this.sessionDate = sessionDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getTimeBoxMins() { return timeBoxMins; }
    public void setTimeBoxMins(int timeBoxMins) { this.timeBoxMins = timeBoxMins; }
    public String getCurrentMemberId() { return currentMemberId; }
    public void setCurrentMemberId(String currentMemberId) { this.currentMemberId = currentMemberId; }
    public String getFacilitatorId() { return facilitatorId; }
    public void setFacilitatorId(String facilitatorId) { this.facilitatorId = facilitatorId; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
