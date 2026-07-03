package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "work_item_type_config")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class WorkItemTypeConfig {
    @Id private String id;
    private String workspaceId;
    private String projectId;
    private String typeKey;
    private String label;
    private String icon;
    private String color;
    private Boolean isCustom = true;
    private OffsetDateTime createdAt;
    /** DELIVERY | RAID | SERVICE */
    private String typeCategory = "DELIVERY";
    private String autoIdPrefix;
    @Column(columnDefinition = "jsonb")
    private String validParentTypes;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getTypeKey() { return typeKey; }
    public void setTypeKey(String typeKey) { this.typeKey = typeKey; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public Boolean getIsCustom() { return isCustom; }
    public void setIsCustom(Boolean isCustom) { this.isCustom = isCustom; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public String getTypeCategory() { return typeCategory; }
    public void setTypeCategory(String typeCategory) { this.typeCategory = typeCategory; }
    public String getAutoIdPrefix() { return autoIdPrefix; }
    public void setAutoIdPrefix(String autoIdPrefix) { this.autoIdPrefix = autoIdPrefix; }
    public String getValidParentTypes() { return validParentTypes; }
    public void setValidParentTypes(String validParentTypes) { this.validParentTypes = validParentTypes; }
}
