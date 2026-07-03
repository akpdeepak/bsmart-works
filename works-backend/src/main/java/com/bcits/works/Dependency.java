package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "dependency")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class Dependency {
    @Id private String id;
    private String workspaceId;
    private String projectId;
    private String title;
    @Column(columnDefinition = "TEXT") private String description;
    private String dependentTeam;
    private String providingTeam;
    private String status = "PENDING"; // PENDING | IN_PROGRESS | RESOLVED | BLOCKED
    private LocalDate deadline;
    private Boolean isBlocker = false;
    private String relatedWorkItemId;
    private String ownerId;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime deletedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getDependentTeam() { return dependentTeam; }
    public void setDependentTeam(String dependentTeam) { this.dependentTeam = dependentTeam; }
    public String getProvidingTeam() { return providingTeam; }
    public void setProvidingTeam(String providingTeam) { this.providingTeam = providingTeam; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDate getDeadline() { return deadline; }
    public void setDeadline(LocalDate deadline) { this.deadline = deadline; }
    public Boolean getIsBlocker() { return isBlocker; }
    public void setIsBlocker(Boolean isBlocker) { this.isBlocker = isBlocker; }
    public String getRelatedWorkItemId() { return relatedWorkItemId; }
    public void setRelatedWorkItemId(String relatedWorkItemId) { this.relatedWorkItemId = relatedWorkItemId; }
    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }
}
