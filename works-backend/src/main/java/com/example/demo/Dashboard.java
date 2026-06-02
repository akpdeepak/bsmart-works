package com.example.demo;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

@Entity
@Table(name = "dashboards")
public class Dashboard {
    @Id private String id;
    private String workspaceId;
    private String ownerId;
    @NotBlank
    private String name;
    private String scope;       // PERSONAL | TEAM | PROJECT | ORG
    private String projectId;
    private Integer layoutCols;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private String shareToken;

    @Transient
    private java.util.List<DashboardWidget> widgets = new java.util.ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public Integer getLayoutCols() { return layoutCols; }
    public void setLayoutCols(Integer layoutCols) { this.layoutCols = layoutCols; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getShareToken() { return shareToken; }
    public void setShareToken(String shareToken) { this.shareToken = shareToken; }
    public java.util.List<DashboardWidget> getWidgets() { return widgets; }
    public void setWidgets(java.util.List<DashboardWidget> widgets) { this.widgets = widgets; }
}
