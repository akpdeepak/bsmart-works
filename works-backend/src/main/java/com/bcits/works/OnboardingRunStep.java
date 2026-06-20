package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * Cap Y · A single step of an onboarding/offboarding run (iteration 16). Workspace-scoped (RB-40 §1).
 */
@Entity
@Table(name = "onboarding_run_steps")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class OnboardingRunStep {
    @Id private String id;
    @NotBlank private String runId;
    @NotBlank private String workspaceId;
    @NotBlank private String title;
    private String actionType = "MANUAL";
    private String status = "PENDING";  // PENDING | DONE | SKIPPED
    private int sortOrder = 0;
    private String completedBy;
    private OffsetDateTime completedAt;
    @Column(columnDefinition = "TEXT") private String note;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public String getCompletedBy() { return completedBy; }
    public void setCompletedBy(String completedBy) { this.completedBy = completedBy; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime completedAt) { this.completedAt = completedAt; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
