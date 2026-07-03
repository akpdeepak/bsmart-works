package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * One per-type field preference: whether {@code fieldKey} is shown on the detail surface for
 * work items of {@code typeKey}, and its order. Workspace-scoped. Absence of a row means the field
 * uses its default (shown). Replaces the old localStorage-only per-type field config (V77).
 */
@Entity
@Table(name = "type_field_prefs")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class TypeFieldPref {

    @Id private String id;
    private String workspaceId;
    private String typeKey;
    private String fieldKey;
    private Boolean visible = true;
    private Integer sortOrder = 0;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String v) { this.workspaceId = v; }
    public String getTypeKey() { return typeKey; }
    public void setTypeKey(String v) { this.typeKey = v; }
    public String getFieldKey() { return fieldKey; }
    public void setFieldKey(String v) { this.fieldKey = v; }
    public Boolean getVisible() { return visible; }
    public void setVisible(Boolean v) { this.visible = v != null ? v : Boolean.TRUE; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v != null ? v : 0; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime v) { this.createdAt = v; }
}
