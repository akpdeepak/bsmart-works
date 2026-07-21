package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "field_def")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class FieldDef {
    @Id private String id;
    private String workspaceId;
    private String projectId;
    private String name;
    private String fieldKey;
    // TEXT | NUMBER | CURRENCY | DATE | DATETIME | SELECT | MULTI_SELECT | USER | URL
    // CHECKBOX | FILE | JSON | TEXTAREA | EMAIL | PHONE | RATING | PROGRESS
    private String fieldType;
    @Column(columnDefinition = "TEXT") private String description;
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb") private String config = "{}";
    private Boolean required = false;
    // Tenant-declared PII flag (RB-40 §3, Slice 4b): when true, this field's text values are tokenized
    // into the per-subject crypto-shred vault instead of stored in plaintext on work_item_field_value.
    private Boolean pii = false;
    private Integer position = 0;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getFieldKey() { return fieldKey; }
    public void setFieldKey(String fieldKey) { this.fieldKey = fieldKey; }
    public String getFieldType() { return fieldType; }
    public void setFieldType(String fieldType) { this.fieldType = fieldType; }
    public String getConfig() { return config; }
    public void setConfig(String config) { this.config = config; }
    public Boolean getRequired() { return required; }
    public void setRequired(Boolean required) { this.required = required; }
    public Boolean getPii() { return pii; }
    public void setPii(Boolean pii) { this.pii = pii; }
    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
