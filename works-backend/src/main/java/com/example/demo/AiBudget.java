package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Per-workspace, per-month AI budget (iteration 10, Cap Z). {@code spentAmount} accrues from
 * {@link AiInvocation} costs; the derived state drives cost discipline (RB-40 §2): under 80% NORMAL
 * (capable tier), 80–&lt;100% DEGRADED (cheap Haiku tier), at/over 100% DISABLED (fallback only).
 * The math lives in {@link AiBudgetService}; admin sets the cap via {@code manage_ai}.
 */
@Entity
@Table(name = "ai_budgets")
public class AiBudget {

    @Id
    private String id;
    private String workspaceId;
    private String periodMonth;
    private BigDecimal capAmount = BigDecimal.ZERO;
    private BigDecimal spentAmount = BigDecimal.ZERO;
    private String currency = "INR";
    private String updatedBy;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getPeriodMonth() { return periodMonth; }
    public void setPeriodMonth(String periodMonth) { this.periodMonth = periodMonth; }
    public BigDecimal getCapAmount() { return capAmount; }
    public void setCapAmount(BigDecimal capAmount) { this.capAmount = capAmount; }
    public BigDecimal getSpentAmount() { return spentAmount; }
    public void setSpentAmount(BigDecimal spentAmount) { this.spentAmount = spentAmount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
