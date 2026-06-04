package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * An SLA policy (iteration 8, Cap M). Scopes a set of work items (project + optional
 * {@code scopeBql}), references a {@link BusinessCalendar}, lists the statuses that
 * auto-pause the clock, and owns one or more {@link SlaTarget}s and {@link SlaEscalation}s.
 * Policies start inactive (test-before-activate), mirroring {@link ComplianceRule}.
 */
@Entity
@Table(name = "sla_policies")
public class SlaPolicy {

    @Id
    private String id;
    private String workspaceId;
    private String projectId;
    @NotBlank
    private String name;
    private String description;
    @Column(name = "scope_bql", columnDefinition = "TEXT")
    private String scopeBql = "";
    private String calendarId;
    @Column(name = "pause_statuses", columnDefinition = "jsonb")
    private String pauseStatuses = "[]";
    private Boolean active = false;
    private Boolean isTemplate = false;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getScopeBql() { return scopeBql; }
    public void setScopeBql(String scopeBql) { this.scopeBql = scopeBql; }
    public String getCalendarId() { return calendarId; }
    public void setCalendarId(String calendarId) { this.calendarId = calendarId; }
    public String getPauseStatuses() { return pauseStatuses; }
    public void setPauseStatuses(String pauseStatuses) { this.pauseStatuses = pauseStatuses; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public Boolean getIsTemplate() { return isTemplate; }
    public void setIsTemplate(Boolean isTemplate) { this.isTemplate = isTemplate; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
