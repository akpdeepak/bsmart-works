package com.bcits.works.service;
import com.bcits.works.workspaces.api.Workspace;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * A post-resolution customer satisfaction rating (iteration 9, Cap N) — one per
 * {@link ServiceRequest}. Rating is 1..5 with an optional comment. Workspace-scoped so CSAT
 * trends never cross tenants (RB-40 §1).
 */
@Entity
@Table(name = "csat_responses")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class CsatResponse {

    @Id
    private String id;
    private String serviceRequestId;
    private String workspaceId;
    private String customerAccountId;
    private Integer rating;
    private String comment;
    private String submittedBy;
    private OffsetDateTime submittedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getServiceRequestId() { return serviceRequestId; }
    public void setServiceRequestId(String serviceRequestId) { this.serviceRequestId = serviceRequestId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getCustomerAccountId() { return customerAccountId; }
    public void setCustomerAccountId(String customerAccountId) { this.customerAccountId = customerAccountId; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public String getSubmittedBy() { return submittedBy; }
    public void setSubmittedBy(String submittedBy) { this.submittedBy = submittedBy; }
    public OffsetDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(OffsetDateTime submittedAt) { this.submittedAt = submittedAt; }
}
