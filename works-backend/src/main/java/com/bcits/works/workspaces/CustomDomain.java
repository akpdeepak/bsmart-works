package com.bcits.works.workspaces;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * A workspace-owned custom domain (B14). DNS / SSL verification is stubbed here and completed
 * in production once DNS is pointed. Status lifecycle:
 * <pre>
 *   PENDING → VERIFIED → ACTIVE
 *                      ↘ FAILED
 * </pre>
 * SSL lifecycle mirrors domain status: PENDING → PROVISIONED | FAILED.
 */
@Entity
@Table(name = "custom_domains")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class CustomDomain {

    @Id
    private String id;

    @Column(name = "workspace_id", nullable = false)
    private String workspaceId;

    @Column(nullable = false, unique = true)
    private String domain;

    /** PENDING | VERIFIED | ACTIVE | FAILED */
    @Column(nullable = false)
    private String status = "PENDING";

    /** DNS TXT record value for verification — set at registration, never changes. */
    @Column(name = "verification_token")
    private String verificationToken;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;

    /** PENDING | PROVISIONED | FAILED */
    @Column(name = "ssl_status", nullable = false)
    private String sslStatus = "PENDING";

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }

    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getVerificationToken() { return verificationToken; }
    public void setVerificationToken(String verificationToken) { this.verificationToken = verificationToken; }

    public OffsetDateTime getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(OffsetDateTime verifiedAt) { this.verifiedAt = verifiedAt; }

    public String getSslStatus() { return sslStatus; }
    public void setSslStatus(String sslStatus) { this.sslStatus = sslStatus; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }
}
