package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "custom_field_definitions")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class CustomFieldDefinition {

    @Id private String id;
    private String workspaceId;
    private String name;
    private String fieldType;

    /** JSON-encoded option list; non-null only for SELECT fields. */
    @Column(columnDefinition = "jsonb")
    private String options;

    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime deletedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String v) { this.workspaceId = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getFieldType() { return fieldType; }
    public void setFieldType(String v) { this.fieldType = v; }
    public String getOptions() { return options; }
    public void setOptions(String v) { this.options = v; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String v) { this.createdBy = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime v) { this.createdAt = v; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime v) { this.deletedAt = v; }
}
