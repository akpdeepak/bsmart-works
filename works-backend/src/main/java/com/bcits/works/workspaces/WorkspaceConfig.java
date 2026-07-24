package com.bcits.works.workspaces;
import com.bcits.works.workspaces.api.Workspace;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.Filter;

/**
 * The live, effective configuration document for a workspace (iteration 17, Cap R — Universal
 * Customization Engine). One row per workspace; a missing row means the system defaults
 * ({@link ConfigDefaults}). The document is the single unified config blob — branding, locale,
 * timezone, working calendar, defaults, custom forms, custom pages, code extensions and the locked
 * paths — stored as jsonb so versioning, diff, rollback, templates and sandbox apply uniformly
 * across all customization. Workspace-scoped (RB-40 §1): workspace_id is the primary key.
 */
@Entity
@Table(name = "workspace_configs")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class WorkspaceConfig {

    @Id
    @Column(name = "workspace_id")
    private String workspaceId;

    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb")
    private String document = "{}";

    @Column(name = "current_version")
    private Integer currentVersion = 0;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getDocument() { return document; }
    public void setDocument(String document) { this.document = document; }
    public Integer getCurrentVersion() { return currentVersion; }
    public void setCurrentVersion(Integer currentVersion) { this.currentVersion = currentVersion; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
