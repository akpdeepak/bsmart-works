package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * An SLA policy (iteration 8, Cap M). Scopes work items via {@code scopeBql} and carries one or
 * more {@link SlaTarget}s (first response, resolution, …), each measured against the optional
 * business-hours {@link SlaCalendar} referenced by {@code calendarId} (null = 24x7). Policies start
 * inactive (test-before-activate). {@code customerTier} is null for internal policies and set for
 * the multi-tier customer SLAs layered on in iteration 9 — the same engine, two contexts.
 * Mirrors the {@code compliance_rules} entity style.
 */
@Entity
@Table(name = "sla_policies")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class SlaPolicy {

    @Id
    private String id;
    private String workspaceId;
    @NotBlank
    private String name;
    private String description;
    @Column(name = "scope_bql", columnDefinition = "TEXT")
    private String scopeBql = "";
    private String calendarId;
    private String customerTier;
    private Boolean active = false;
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
    public String getScopeBql() { return scopeBql; }
    public void setScopeBql(String scopeBql) { this.scopeBql = scopeBql; }
    public String getCalendarId() { return calendarId; }
    public void setCalendarId(String calendarId) { this.calendarId = calendarId; }
    public String getCustomerTier() { return customerTier; }
    public void setCustomerTier(String customerTier) { this.customerTier = customerTier; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
