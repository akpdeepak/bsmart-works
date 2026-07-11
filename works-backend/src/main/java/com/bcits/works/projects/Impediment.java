package com.bcits.works.projects;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * Cap V · Impediment tracker (I15-S03). A first-class blocker artifact — owner, severity, age and
 * escalation — so impediments live in the Scrum Master cockpit rather than buried in chat.
 */
@Entity
@Table(name = "impediments")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class Impediment {
    @Id private String id;
    private String workspaceId;
    @NotBlank private String projectId;
    private String sprintId;
    @NotBlank private String title;
    @Column(columnDefinition = "TEXT") private String description;
    private String category;
    private String raiseType = "IMPEDIMENT"; // IMPEDIMENT | RISK | DEPENDENCY | SCOPE_CHANGE | DECISION_NEEDED | ESCALATION
    private String severity = "MEDIUM";   // LOW | MEDIUM | HIGH | CRITICAL
    private String status = "OPEN";       // OPEN | IN_PROGRESS | ESCALATED | RESOLVED
    private String ownerId;
    private String raisedBy;
    private LocalDate raisedAt;
    private LocalDate resolvedAt;
    private boolean escalated = false;
    private String relatedWorkItemId;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime deletedAt;
    // Derived per request, never stored: SLA flag for CRITICAL raises left unresolved > 1 day.
    @jakarta.persistence.Transient private boolean slaBreached;

    public String getId() { return id; }
    public String getRaiseType() { return raiseType; }
    public void setRaiseType(String raiseType) { this.raiseType = raiseType; }
    public boolean isSlaBreached() { return slaBreached; }
    public void setSlaBreached(boolean slaBreached) { this.slaBreached = slaBreached; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getSprintId() { return sprintId; }
    public void setSprintId(String sprintId) { this.sprintId = sprintId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
    public String getRaisedBy() { return raisedBy; }
    public void setRaisedBy(String raisedBy) { this.raisedBy = raisedBy; }
    public LocalDate getRaisedAt() { return raisedAt; }
    public void setRaisedAt(LocalDate raisedAt) { this.raisedAt = raisedAt; }
    public LocalDate getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDate resolvedAt) { this.resolvedAt = resolvedAt; }
    public boolean isEscalated() { return escalated; }
    public void setEscalated(boolean escalated) { this.escalated = escalated; }
    public String getRelatedWorkItemId() { return relatedWorkItemId; }
    public void setRelatedWorkItemId(String relatedWorkItemId) { this.relatedWorkItemId = relatedWorkItemId; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }
}
