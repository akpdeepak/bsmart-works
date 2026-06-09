package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.ColumnTransformer;

/**
 * An append-only automation run record (iteration 13, Cap C) — every execution and every dry-run
 * test, with inputs and outputs, for the automation audit log (RB-20 §5).
 */
@Entity
@Table(name = "automation_runs")
public class AutomationRun {

    @Id
    private String id;
    private String workspaceId;
    private String ruleId;
    private String status;          // SUCCESS | FAILED | NOOP | DRY_RUN
    private String triggerSummary;
    private Integer affectedCount = 0;
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb")
    private String detail = "{}";
    private Boolean dryRun = false;
    @Column(columnDefinition = "TEXT")
    private String error;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTriggerSummary() { return triggerSummary; }
    public void setTriggerSummary(String triggerSummary) { this.triggerSummary = triggerSummary; }
    public Integer getAffectedCount() { return affectedCount; }
    public void setAffectedCount(Integer affectedCount) { this.affectedCount = affectedCount; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
    public Boolean getDryRun() { return dryRun; }
    public void setDryRun(Boolean dryRun) { this.dryRun = dryRun; }
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
