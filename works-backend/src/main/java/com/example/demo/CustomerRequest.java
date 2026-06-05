package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * A customer request (iteration 9, Cap N) — the ticket a customer raises from the portal and the
 * working set an internal agent picks from. It carries the answered {@code formData} for its
 * {@link RequestType}, a lifecycle {@code status} (OPEN → IN_PROGRESS → WAITING → RESOLVED → CLOSED),
 * a {@code priority}, the internal {@code assigneeId} agent, and an optional {@code workItemId}
 * linking it to an internal work item — that link is what lets the "one SLA engine, two contexts"
 * commitment surface the same countdown to agent and customer. After resolution the customer may
 * leave a {@code csatRating} (1–5) and comment. Workspace- and organization-scoped (RB-40 §1).
 * Mirrors the {@code compliance_violations} entity style.
 */
@Entity
@Table(name = "customer_requests")
public class CustomerRequest {

    @Id
    private String id;
    private String workspaceId;
    private String organizationId;
    private String requestTypeId;
    private String submittedBy;          // the customer account id
    @NotBlank
    private String subject;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(name = "form_data", columnDefinition = "jsonb")
    private String formData = "{}";
    private String status = "OPEN";
    private String priority = "MEDIUM";
    private String assigneeId;            // the internal agent who owns it
    private String workItemId;            // linked internal work item (null until triaged)
    private Integer csatRating;
    @Column(columnDefinition = "TEXT")
    private String csatComment;
    private OffsetDateTime createdAt;
    private OffsetDateTime resolvedAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getOrganizationId() { return organizationId; }
    public void setOrganizationId(String organizationId) { this.organizationId = organizationId; }
    public String getRequestTypeId() { return requestTypeId; }
    public void setRequestTypeId(String requestTypeId) { this.requestTypeId = requestTypeId; }
    public String getSubmittedBy() { return submittedBy; }
    public void setSubmittedBy(String submittedBy) { this.submittedBy = submittedBy; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getFormData() { return formData; }
    public void setFormData(String formData) { this.formData = formData; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public String getAssigneeId() { return assigneeId; }
    public void setAssigneeId(String assigneeId) { this.assigneeId = assigneeId; }
    public String getWorkItemId() { return workItemId; }
    public void setWorkItemId(String workItemId) { this.workItemId = workItemId; }
    public Integer getCsatRating() { return csatRating; }
    public void setCsatRating(Integer csatRating) { this.csatRating = csatRating; }
    public String getCsatComment() { return csatComment; }
    public void setCsatComment(String csatComment) { this.csatComment = csatComment; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(OffsetDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
