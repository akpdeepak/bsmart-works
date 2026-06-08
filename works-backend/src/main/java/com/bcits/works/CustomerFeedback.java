package com.bcits.works;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * Cap W · Customer feedback aggregation (I15-S11). A single piece of customer feedback from a portal,
 * email, comment, or interview — clustered into a theme with a sentiment so the PO sees signal, not
 * 47 raw emails. Workspace-scoped; project optional.
 */
@Entity
@Table(name = "customer_feedback_items")
public class CustomerFeedback {
    @Id private String id;
    @NotBlank private String workspaceId;
    private String projectId;
    private String source = "PORTAL"; // PORTAL | EMAIL | COMMENT | INTERVIEW
    private String customer;
    @NotBlank @Column(columnDefinition = "TEXT") private String content;
    private String sentiment;         // POSITIVE | NEUTRAL | NEGATIVE
    private String theme;
    private String status = "NEW";    // NEW | TRIAGED | LINKED | CLOSED
    private String linkedWorkItemId;
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
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getCustomer() { return customer; }
    public void setCustomer(String customer) { this.customer = customer; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getSentiment() { return sentiment; }
    public void setSentiment(String sentiment) { this.sentiment = sentiment; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getLinkedWorkItemId() { return linkedWorkItemId; }
    public void setLinkedWorkItemId(String linkedWorkItemId) { this.linkedWorkItemId = linkedWorkItemId; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }
}
