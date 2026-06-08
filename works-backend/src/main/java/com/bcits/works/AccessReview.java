package com.bcits.works;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * Cap Y · Access review (iteration 16). A periodic review record — who still has access, how many
 * were reviewed, how many deactivated. Workspace-scoped (RB-40 §1).
 */
@Entity
@Table(name = "access_reviews")
public class AccessReview {
    @Id private String id;
    @NotBlank private String workspaceId;
    private String status = "OPEN";  // OPEN | COMPLETED
    private int inactiveThresholdDays = 90;
    private int reviewedCount = 0;
    private int deactivatedCount = 0;
    @Column(columnDefinition = "TEXT") private String summary;
    private String startedBy;
    private OffsetDateTime startedAt;
    private OffsetDateTime completedAt;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getInactiveThresholdDays() { return inactiveThresholdDays; }
    public void setInactiveThresholdDays(int inactiveThresholdDays) { this.inactiveThresholdDays = inactiveThresholdDays; }
    public int getReviewedCount() { return reviewedCount; }
    public void setReviewedCount(int reviewedCount) { this.reviewedCount = reviewedCount; }
    public int getDeactivatedCount() { return deactivatedCount; }
    public void setDeactivatedCount(int deactivatedCount) { this.deactivatedCount = deactivatedCount; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getStartedBy() { return startedBy; }
    public void setStartedBy(String startedBy) { this.startedBy = startedBy; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime completedAt) { this.completedAt = completedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
