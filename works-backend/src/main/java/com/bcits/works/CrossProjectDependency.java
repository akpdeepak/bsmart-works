package com.bcits.works;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "cross_project_dependencies")
public class CrossProjectDependency {
    @Id private String id;
    private String fromProjectId;
    private String toProjectId;
    @Column(columnDefinition = "TEXT") private String title;
    @Column(columnDefinition = "TEXT") private String description;
    private LocalDate deadline;
    private String status;     // PENDING | IN_PROGRESS | COMPLETE | BLOCKED
    private Boolean isBlocker;
    private String ownerId;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFromProjectId() { return fromProjectId; }
    public void setFromProjectId(String fromProjectId) { this.fromProjectId = fromProjectId; }
    public String getToProjectId() { return toProjectId; }
    public void setToProjectId(String toProjectId) { this.toProjectId = toProjectId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDate getDeadline() { return deadline; }
    public void setDeadline(LocalDate deadline) { this.deadline = deadline; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getIsBlocker() { return isBlocker; }
    public void setIsBlocker(Boolean isBlocker) { this.isBlocker = isBlocker; }
    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
