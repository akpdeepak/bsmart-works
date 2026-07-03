package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * Cap Y · License / seat management (iteration 16). One config row per workspace: plan, total seats,
 * cost per seat, renewal date. Active/available seats are computed live from workspace_members.
 * Workspace-scoped (RB-40 §1) — workspace_id is the primary key.
 */
@Entity
@Table(name = "license_seats")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class LicenseSeats {
    @Id private String workspaceId;
    private String planName = "Standard";
    private int totalSeats = 0;
    private int costPerSeatCents = 0;
    private LocalDate renewalDate;
    private OffsetDateTime updatedAt;

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }
    public int getTotalSeats() { return totalSeats; }
    public void setTotalSeats(int totalSeats) { this.totalSeats = totalSeats; }
    public int getCostPerSeatCents() { return costPerSeatCents; }
    public void setCostPerSeatCents(int costPerSeatCents) { this.costPerSeatCents = costPerSeatCents; }
    public LocalDate getRenewalDate() { return renewalDate; }
    public void setRenewalDate(LocalDate renewalDate) { this.renewalDate = renewalDate; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
