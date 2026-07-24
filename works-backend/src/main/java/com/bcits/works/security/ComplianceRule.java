package com.bcits.works.security;
import com.bcits.works.shared.BqlCompiler;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.Filter;

/**
 * A compliance rule (iteration 7, Cap K). Scopes work items via {@code scopeBql} and
 * asserts a condition via {@code assertionBql}; both compile through {@link BqlCompiler}.
 * Rules start inactive (test-before-activate). Mirrors the {@code reports} entity style.
 */
@Entity
@Table(name = "compliance_rules")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
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
    @ColumnTransformer(write = "?::jsonb")
    @Column(name = "notify_to", columnDefinition = "jsonb")
    private String notifyTo = "[]";
    private Boolean active = false;
    private Boolean isTemplate = false;
    @Column(name = "evaluation_mode")
    private String evaluationMode = "CONTINUOUS";   // CONTINUOUS | SCHEDULED
    @Column(name = "escalate_after_hours")
    private Integer escalateAfterHours;             // NULL = no escalation
    @ColumnTransformer(write = "?::jsonb")
    @Column(name = "escalate_to", columnDefinition = "jsonb")
    private String escalateTo = "[]";               // routing targets for escalation
    @ColumnTransformer(write = "?::jsonb")
    @Column(name = "escalation_steps", columnDefinition = "jsonb")
    private String escalationSteps = "[]";          // multi-step: [{hours,targets:[{type,...}]},...]
    @Column(name = "last_evaluated_at")
    private OffsetDateTime lastEvaluatedAt;
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
    public String getEvaluationMode() { return evaluationMode; }
    public void setEvaluationMode(String evaluationMode) { this.evaluationMode = evaluationMode; }
    public Integer getEscalateAfterHours() { return escalateAfterHours; }
    public void setEscalateAfterHours(Integer escalateAfterHours) { this.escalateAfterHours = escalateAfterHours; }
    public String getEscalateTo() { return escalateTo; }
    public void setEscalateTo(String escalateTo) { this.escalateTo = escalateTo; }
    public String getEscalationSteps() { return escalationSteps; }
    public void setEscalationSteps(String escalationSteps) { this.escalationSteps = escalationSteps; }
    public OffsetDateTime getLastEvaluatedAt() { return lastEvaluatedAt; }
    public void setLastEvaluatedAt(OffsetDateTime lastEvaluatedAt) { this.lastEvaluatedAt = lastEvaluatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
