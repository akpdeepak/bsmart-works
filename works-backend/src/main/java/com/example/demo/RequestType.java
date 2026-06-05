package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * A customer request type (iteration 9, Cap N): Incident / Change / Service plus admin-defined
 * custom types. {@code formSchema} is the portal form for this type — an ordered JSON array of
 * field definitions that may declare conditional visibility ({@code showIf}). Workspace-scoped.
 */
@Entity
@Table(name = "request_types")
public class RequestType {

    @Id
    private String id;
    private String workspaceId;
    private String typeKey;
    @NotBlank
    private String name;
    private String description;
    private String icon;
    @Column(name = "form_schema", columnDefinition = "jsonb")
    private String formSchema = "[]";
    private String defaultPriority = "MEDIUM";
    private Boolean active = true;
    private Boolean isSystem = false;
    private Integer sortOrder = 0;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getTypeKey() { return typeKey; }
    public void setTypeKey(String typeKey) { this.typeKey = typeKey; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getFormSchema() { return formSchema; }
    public void setFormSchema(String formSchema) { this.formSchema = formSchema; }
    public String getDefaultPriority() { return defaultPriority; }
    public void setDefaultPriority(String defaultPriority) { this.defaultPriority = defaultPriority; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public Boolean getIsSystem() { return isSystem; }
    public void setIsSystem(Boolean isSystem) { this.isSystem = isSystem; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
