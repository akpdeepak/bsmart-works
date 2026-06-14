package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * Cap V · Sprint Cockpit Capacity tab. One mutable config row per (sprint, member) holding only the
 * editable inputs — a working-days override, days off, and a focus factor. The story-points budget
 * is deliberately NOT stored: {@link SprintCapacityService} computes it at read time from the
 * sprint's working days and the team's rolling velocity, so the board always reflects current
 * velocity/headcount (store config, derive figures). Persisted by V90.
 */
@Entity
@Table(name = "sprint_member_capacities")
public class SprintMemberCapacity {
    @Id private String id;
    private String workspaceId;
    @NotBlank private String sprintId;
    @NotBlank private String userId;
    private Integer workingDays;        // nullable override of the computed sprint working days
    private Integer timeOffDays;
    private Integer focusFactorPct;     // 0..100
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getSprintId() { return sprintId; }
    public void setSprintId(String sprintId) { this.sprintId = sprintId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public Integer getWorkingDays() { return workingDays; }
    public void setWorkingDays(Integer workingDays) { this.workingDays = workingDays; }
    public Integer getTimeOffDays() { return timeOffDays; }
    public void setTimeOffDays(Integer timeOffDays) { this.timeOffDays = timeOffDays; }
    public Integer getFocusFactorPct() { return focusFactorPct; }
    public void setFocusFactorPct(Integer focusFactorPct) { this.focusFactorPct = focusFactorPct; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
