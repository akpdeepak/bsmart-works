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
 * Cap W · Stakeholder communication (I15-S14). Targeted release/status messages on the existing
 * stakeholder map — not blast email. RBAC + tenant scoping live in the service (RB-10 §2, RB-40 §1).
 */
@Entity
@Table(name = "stakeholder_communications")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class StakeholderCommunication {
    @Id private String id;
    private String workspaceId;
    @NotBlank private String projectId;
    @NotBlank private String subject;
    @Column(columnDefinition = "TEXT") private String body;
    private String channel = "EMAIL"; // EMAIL | MEETING | PORTAL | CALL
    private String relatedReleaseId;
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb") private String stakeholderIds = "[]";
    private String status = "DRAFT";  // DRAFT | SENT
    private OffsetDateTime sentAt;
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
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public String getRelatedReleaseId() { return relatedReleaseId; }
    public void setRelatedReleaseId(String relatedReleaseId) { this.relatedReleaseId = relatedReleaseId; }
    public String getStakeholderIds() { return stakeholderIds; }
    public void setStakeholderIds(String stakeholderIds) { this.stakeholderIds = stakeholderIds; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getSentAt() { return sentAt; }
    public void setSentAt(OffsetDateTime sentAt) { this.sentAt = sentAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }
}
