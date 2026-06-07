package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** A GDPR / DPDP data-subject request — EXPORT (data portability) or ERASURE (right to be
 *  forgotten, via crypto-shred semantics, RB-40 §3). Workspace-scoped (RB-40 §1). Iteration 19. */
@Entity
@Table(name = "data_subject_requests")
public class DataSubjectRequest {

    @Id
    private String id;

    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(name = "subject_user_id")
    private String subjectUserId;

    @Column(name = "subject_email")
    private String subjectEmail;

    private String type;     // EXPORT | ERASURE

    private String status = "PENDING";   // PENDING | PROCESSING | COMPLETED | FAILED

    @Column(name = "requested_by")
    private String requestedBy;

    @Column(name = "requested_at")
    private OffsetDateTime requestedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "result_summary", columnDefinition = "TEXT")
    private String resultSummary;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getSubjectUserId() { return subjectUserId; }
    public void setSubjectUserId(String subjectUserId) { this.subjectUserId = subjectUserId; }
    public String getSubjectEmail() { return subjectEmail; }
    public void setSubjectEmail(String subjectEmail) { this.subjectEmail = subjectEmail; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRequestedBy() { return requestedBy; }
    public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }
    public OffsetDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(OffsetDateTime requestedAt) { this.requestedAt = requestedAt; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime completedAt) { this.completedAt = completedAt; }
    public String getResultSummary() { return resultSummary; }
    public void setResultSummary(String resultSummary) { this.resultSummary = resultSummary; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
