package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * A workspace's AI spend cap and running total for one month (RB-40 §2). The control plane
 * degrades to the cheap tier at 80% of the cap and auto-disables AI (serving fallbacks) at 100%.
 */
@Entity
@Table(name = "ai_budgets")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class AiBudget {

    @Id
    private String id;
    private String workspaceId;
    private String period;              // YYYY-MM
    private Long monthlyCapCents = 10000L;
    private Long spentCents = 0L;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public Long getMonthlyCapCents() { return monthlyCapCents; }
    public void setMonthlyCapCents(Long monthlyCapCents) { this.monthlyCapCents = monthlyCapCents; }
    public Long getSpentCents() { return spentCents; }
    public void setSpentCents(Long spentCents) { this.spentCents = spentCents; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    /** Spend as a percentage of the cap (0–∞). A non-positive cap is treated as 100% used. */
    public int spentPercent() {
        long cap = monthlyCapCents == null ? 0L : monthlyCapCents;
        long spent = spentCents == null ? 0L : spentCents;
        if (cap <= 0) {
            return 100;
        }
        return (int) Math.floor((spent * 100.0) / cap);
    }
}
