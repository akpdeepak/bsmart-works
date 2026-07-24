package com.bcits.works.security;
import com.bcits.works.workspaces.api.Workspace;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/** Configuration for streaming a workspace's audit log to an external SIEM — Splunk, Datadog, ELK
 *  or a generic signed webhook (iteration 19 Cap T). Workspace-scoped (RB-40 §1). */
@Entity
@Table(name = "audit_log_stream_configs")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class AuditLogStreamConfig {

    @Id
    private String id;

    @Column(name = "workspace_id")
    private String workspaceId;

    private String provider;       // SPLUNK | DATADOG | ELK | WEBHOOK

    @Column(name = "endpoint_url")
    private String endpointUrl;

    @Column(name = "auth_header")
    private String authHeader;

    private String format = "JSON";   // JSON | CEF

    private boolean enabled = true;

    @Column(name = "last_streamed_seq")
    private long lastStreamedSeq = 0;

    @Column(name = "last_streamed_at")
    private OffsetDateTime lastStreamedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getEndpointUrl() { return endpointUrl; }
    public void setEndpointUrl(String endpointUrl) { this.endpointUrl = endpointUrl; }
    public String getAuthHeader() { return authHeader; }
    public void setAuthHeader(String authHeader) { this.authHeader = authHeader; }
    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public long getLastStreamedSeq() { return lastStreamedSeq; }
    public void setLastStreamedSeq(long lastStreamedSeq) { this.lastStreamedSeq = lastStreamedSeq; }
    public OffsetDateTime getLastStreamedAt() { return lastStreamedAt; }
    public void setLastStreamedAt(OffsetDateTime lastStreamedAt) { this.lastStreamedAt = lastStreamedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
