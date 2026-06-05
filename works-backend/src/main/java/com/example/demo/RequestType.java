package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * A request type (iteration 9, Cap N) — what a customer can raise from the portal: INCIDENT,
 * CHANGE_REQUEST, SERVICE_REQUEST, or a workspace-defined CUSTOM type. The {@code formSchema} is an
 * ordered JSON array of field definitions (label, key, type, required, options, conditional) that
 * drives the portal's dynamic form; submitted answers are validated against the required fields
 * server-side. Workspace-scoped (RB-40 §1); managed by internal agents/admins ({@code manage_service}).
 * Mirrors the {@code sla_policies} entity style.
 */
@Entity
@Table(name = "request_types")
public class RequestType {

    @Id
    private String id;
    private String workspaceId;
    @NotBlank
    private String name;
    private String category = "SERVICE_REQUEST";
    private String description;
    @Column(name = "form_schema", columnDefinition = "jsonb")
    private String formSchema = "[]";
    private Boolean active = true;
    private Integer sortOrder = 0;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getFormSchema() { return formSchema; }
    public void setFormSchema(String formSchema) { this.formSchema = formSchema; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
