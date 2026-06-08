package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * One immutable, append-only snapshot of a workspace's configuration (iteration 17, Cap R). Every
 * change to the live config writes a new version here first, so any prior state can be diffed or
 * rolled back to. version_number is monotonic per workspace; {@code source} records how it was
 * produced (MANUAL | IMPORT | TEMPLATE | ROLLBACK | SANDBOX_PROMOTE). Workspace-scoped (RB-40 §1).
 */
@Entity
@Table(name = "config_versions")
public class ConfigVersion {

    @Id
    private String id;

    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(name = "version_number")
    private Integer versionNumber;

    @Column(columnDefinition = "jsonb")
    private String document;

    @Column(columnDefinition = "TEXT")
    private String summary;

    private String source;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }
    public String getDocument() { return document; }
    public void setDocument(String document) { this.document = document; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
