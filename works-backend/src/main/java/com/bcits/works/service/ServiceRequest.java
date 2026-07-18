package com.bcits.works.service;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.Filter;

/**
 * A customer-filed service request (iteration 9, Cap N) — the external face of an internal
 * Incident/Change/Service item. Worked by internal agents through pre-filtered queues, carries a
 * customer-facing SLA countdown (Cap M) derived from the customer's tier, and ends with CSAT.
 * Tenant-scoped by {@code workspaceId}; {@code linkedWorkItemId} is the integration seam to an
 * internal work item so a filed request need not be re-entered.
 */
@Entity
@Table(name = "service_requests")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class ServiceRequest {

    @Id
    private String id;
    private String workspaceId;
    private String customerAccountId;
    private String requestTypeId;
    private String typeKey;
    private String submittedBy;
    @NotBlank
    private String subject;
    private String description;
    @ColumnTransformer(write = "?::jsonb")
    @Column(name = "form_data", columnDefinition = "jsonb")
    private String formData = "{}";
    private String priority = "MEDIUM";
    private String status = "NEW";
    private String assigneeId;
    private String slaTier;
    private Integer slaResponseMinutes;
    private Integer slaResolutionMinutes;
    private OffsetDateTime slaDueAt;
    private OffsetDateTime firstRespondedAt;
    private OffsetDateTime resolvedAt;
    private OffsetDateTime closedAt;
    private String linkedWorkItemId;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getCustomerAccountId() { return customerAccountId; }
    public void setCustomerAccountId(String customerAccountId) { this.customerAccountId = customerAccountId; }
    public String getRequestTypeId() { return requestTypeId; }
    public void setRequestTypeId(String requestTypeId) { this.requestTypeId = requestTypeId; }
    public String getTypeKey() { return typeKey; }
    public void setTypeKey(String typeKey) { this.typeKey = typeKey; }
    public String getSubmittedBy() { return submittedBy; }
    public void setSubmittedBy(String submittedBy) { this.submittedBy = submittedBy; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getFormData() { return formData; }
    public void setFormData(String formData) { this.formData = formData; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getAssigneeId() { return assigneeId; }
    public void setAssigneeId(String assigneeId) { this.assigneeId = assigneeId; }
    public String getSlaTier() { return slaTier; }
    public void setSlaTier(String slaTier) { this.slaTier = slaTier; }
    public Integer getSlaResponseMinutes() { return slaResponseMinutes; }
    public void setSlaResponseMinutes(Integer slaResponseMinutes) { this.slaResponseMinutes = slaResponseMinutes; }
    public Integer getSlaResolutionMinutes() { return slaResolutionMinutes; }
    public void setSlaResolutionMinutes(Integer slaResolutionMinutes) { this.slaResolutionMinutes = slaResolutionMinutes; }
    public OffsetDateTime getSlaDueAt() { return slaDueAt; }
    public void setSlaDueAt(OffsetDateTime slaDueAt) { this.slaDueAt = slaDueAt; }
    public OffsetDateTime getFirstRespondedAt() { return firstRespondedAt; }
    public void setFirstRespondedAt(OffsetDateTime firstRespondedAt) { this.firstRespondedAt = firstRespondedAt; }
    public OffsetDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(OffsetDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
    public OffsetDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(OffsetDateTime closedAt) { this.closedAt = closedAt; }
    public String getLinkedWorkItemId() { return linkedWorkItemId; }
    public void setLinkedWorkItemId(String linkedWorkItemId) { this.linkedWorkItemId = linkedWorkItemId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
