package com.example.demo;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "risk")
public class Risk {
    @Id private String id;
    private String workspaceId;
    private String projectId;
    private String title;
    @Column(columnDefinition = "TEXT") private String description;
    private String category;
    private String probability = "MEDIUM"; // LOW | MEDIUM | HIGH | VERY_HIGH
    private String impact = "MEDIUM";       // LOW | MEDIUM | HIGH | CRITICAL
    private String status = "OPEN";         // OPEN | MITIGATED | CLOSED | ACCEPTED
    @Column(columnDefinition = "TEXT") private String mitigationPlan;
    @Column(columnDefinition = "TEXT") private String contingencyPlan;
    private String ownerId;
    private LocalDate reviewDate;
    private String relatedWorkItemId;
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
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getProbability() { return probability; }
    public void setProbability(String probability) { this.probability = probability; }
    public String getImpact() { return impact; }
    public void setImpact(String impact) { this.impact = impact; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMitigationPlan() { return mitigationPlan; }
    public void setMitigationPlan(String mitigationPlan) { this.mitigationPlan = mitigationPlan; }
    public String getContingencyPlan() { return contingencyPlan; }
    public void setContingencyPlan(String contingencyPlan) { this.contingencyPlan = contingencyPlan; }
    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
    public LocalDate getReviewDate() { return reviewDate; }
    public void setReviewDate(LocalDate reviewDate) { this.reviewDate = reviewDate; }
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
