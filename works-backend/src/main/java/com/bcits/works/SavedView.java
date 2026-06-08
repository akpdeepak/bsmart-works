package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** A named work-item view: BQL filter + column selection, optionally shared within the workspace (iteration 17, Cap R). */
@Entity
@Table(name = "saved_views")
public class SavedView {

    @Id private String id;
    private String workspaceId;
    private String projectId;
    private String itemType;
    private String name;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(name = "bql_filter", columnDefinition = "TEXT") private String bqlFilter;
    @Column(name = "column_keys", columnDefinition = "TEXT") private String columnKeys;
    private Boolean isShared = false;
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
    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getBqlFilter() { return bqlFilter; }
    public void setBqlFilter(String bqlFilter) { this.bqlFilter = bqlFilter; }
    public String getColumnKeys() { return columnKeys; }
    public void setColumnKeys(String columnKeys) { this.columnKeys = columnKeys; }
    public Boolean getIsShared() { return isShared; }
    public void setIsShared(Boolean isShared) { this.isShared = isShared; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }
}
