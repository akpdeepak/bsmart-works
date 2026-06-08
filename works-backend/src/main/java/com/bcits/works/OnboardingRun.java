package com.bcits.works;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * Cap Y · A run of an onboarding/offboarding playbook for one subject (iteration 16). Tracks
 * progress and an audit trail. Workspace-scoped (RB-40 §1).
 */
@Entity
@Table(name = "onboarding_runs")
public class OnboardingRun {
    @Id private String id;
    @NotBlank private String workspaceId;
    @NotBlank private String playbookId;
    private String kind = "ONBOARD";
    @NotBlank private String subjectName;
    private String subjectEmail;
    private String subjectUserId;
    private String status = "IN_PROGRESS";  // IN_PROGRESS | COMPLETED | CANCELLED
    private String startedBy;
    private OffsetDateTime startedAt;
    private OffsetDateTime completedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getPlaybookId() { return playbookId; }
    public void setPlaybookId(String playbookId) { this.playbookId = playbookId; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getSubjectName() { return subjectName; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }
    public String getSubjectEmail() { return subjectEmail; }
    public void setSubjectEmail(String subjectEmail) { this.subjectEmail = subjectEmail; }
    public String getSubjectUserId() { return subjectUserId; }
    public void setSubjectUserId(String subjectUserId) { this.subjectUserId = subjectUserId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getStartedBy() { return startedBy; }
    public void setStartedBy(String startedBy) { this.startedBy = startedBy; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime completedAt) { this.completedAt = completedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
