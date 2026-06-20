package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.Filter;

/**
 * An automation rule (iteration 13, Cap C): "When [trigger], if [condition], then [action(s)]".
 * Rules start disabled (test-before-activate). {@code conditionExpr} is a safe field predicate
 * (evaluated by {@link AutomationService}); {@code actions} is a JSON list of {type, params}.
 */
@Entity
@Table(name = "automation_rules")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class AutomationRule {

    @Id
    private String id;
    private String workspaceId;
    @NotBlank
    private String name;
    @Column(columnDefinition = "TEXT")
    private String description;
    private String triggerType;     // ITEM_CREATED | ITEM_UPDATED | STATUS_CHANGED | ITEM_ASSIGNED | SCHEDULED
    @ColumnTransformer(write = "?::jsonb")
    @Column(name = "trigger_config", columnDefinition = "jsonb")
    private String triggerConfig = "{}";
    @Column(name = "condition_expr", columnDefinition = "TEXT")
    private String conditionExpr = "";
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb")
    private String actions = "[]";
    private Boolean enabled = false;
    private String scheduleCron;
    private Integer runCount = 0;
    private OffsetDateTime lastRunAt;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }
    public String getTriggerConfig() { return triggerConfig; }
    public void setTriggerConfig(String triggerConfig) { this.triggerConfig = triggerConfig; }
    public String getConditionExpr() { return conditionExpr; }
    public void setConditionExpr(String conditionExpr) { this.conditionExpr = conditionExpr; }
    public String getActions() { return actions; }
    public void setActions(String actions) { this.actions = actions; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getScheduleCron() { return scheduleCron; }
    public void setScheduleCron(String scheduleCron) { this.scheduleCron = scheduleCron; }
    public Integer getRunCount() { return runCount; }
    public void setRunCount(Integer runCount) { this.runCount = runCount; }
    public OffsetDateTime getLastRunAt() { return lastRunAt; }
    public void setLastRunAt(OffsetDateTime lastRunAt) { this.lastRunAt = lastRunAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
