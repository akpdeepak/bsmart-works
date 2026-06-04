package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * A compliance rule (iteration 7, Cap K). Scopes work items via {@code scopeBql} and
 * asserts a condition via {@code assertionBql}; both compile through {@link BqlCompiler}.
 * Rules start inactive (test-before-activate). Mirrors the {@code reports} entity style.
 */
@Entity
@Table(name = "compliance_rules")
public class ComplianceRule {

    @Id
    private String id;
    private String workspaceId;
    private String projectId;
    @NotBlank
    private String name;
    private String description;
    @Column(name = "scope_bql", columnDefinition = "TEXT")
    private String scopeBql = "";
    @Column(name = "assertion_bql", columnDefinition = "TEXT")
    private String assertionBql;
    private String severity = "MEDIUM";
    @Column(name = "notify_to", columnDefinition = "jsonb")
    private String notifyTo = "[]";
    private Boolean active = false;
    private Boolean isTemplate = false;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getScopeBql() { return scopeBql; }
    public void setScopeBql(String scopeBql) { this.scopeBql = scopeBql; }
    public String getAssertionBql() { return assertionBql; }
    public void setAssertionBql(String assertionBql) { this.assertionBql = assertionBql; }
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    public String getNotifyTo() { return notifyTo; }
    public void setNotifyTo(String notifyTo) { this.notifyTo = notifyTo; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public Boolean getIsTemplate() { return isTemplate; }
    public void setIsTemplate(Boolean isTemplate) { this.isTemplate = isTemplate; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
