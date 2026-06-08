package com.bcits.works;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "field_def")
public class FieldDef {
    @Id private String id;
    private String workspaceId;
    private String projectId;
    private String name;
    private String fieldKey;
    private String fieldType; // TEXT | NUMBER | CURRENCY | DATE | SELECT | MULTI_SELECT | USER | URL | CHECKBOX | FILE | JSON | TEXTAREA | EMAIL | PHONE | RATING | PROGRESS
    @Column(columnDefinition = "jsonb") private String config = "{}";
    private Boolean required = false;
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
    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
