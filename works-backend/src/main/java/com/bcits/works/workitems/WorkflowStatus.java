package com.bcits.works.workitems;

import com.bcits.works.shared.WorkspaceFilterActivator;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "workflow_status")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "workflow_id IN (SELECT w.id FROM workflow w WHERE w.workspace_id = :workspaceId)")
public class WorkflowStatus {
    @Id private String id;
    private String workflowId;
    private String name;
    private String category = "TODO"; // TODO | IN_PROGRESS | DONE
    private String color = "#94a3b8";
    private Integer position = 0;
    private Boolean isInitial = false;

    // ── Lapse clock (V73) — time-in-status thresholds, in hours; null = no clock ──
    /** Hours after which the status turns amber ("at risk"); null disables the warn clock. */
    private BigDecimal warnHours;
    /** Hours after which the status turns red ("breached"); null disables the breach clock. */
    private BigDecimal breachHours;
    /** NEUTRAL | POSITIVE (successfully done) | NEGATIVE (closed-out, e.g. Cancelled / Won't Fix). */
    private String outcome = "NEUTRAL";

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkflowId() { return workflowId; }
    public void setWorkflowId(String workflowId) { this.workflowId = workflowId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }
    public Boolean getIsInitial() { return isInitial; }
    public void setIsInitial(Boolean isInitial) { this.isInitial = isInitial; }
    public BigDecimal getWarnHours() { return warnHours; }
    public void setWarnHours(BigDecimal warnHours) { this.warnHours = warnHours; }
    public BigDecimal getBreachHours() { return breachHours; }
    public void setBreachHours(BigDecimal breachHours) { this.breachHours = breachHours; }
    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome != null ? outcome : "NEUTRAL"; }
}
