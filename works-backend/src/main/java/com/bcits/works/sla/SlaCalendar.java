package com.bcits.works.sla;

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
 * A business-hours calendar (iteration 8, Cap M). Defines the working windows against which SLA
 * business-minutes are measured, so a clock does not unfairly burn time outside office hours,
 * on weekends, or on holidays. {@code workWeek} is a JSON object of per-weekday windows
 * (e.g. {@code {"MON":[["09:00","18:00"]]}}); {@code holidays} is a JSON array of ISO dates.
 * A policy with no calendar is treated as 24x7. Mirrors the {@code compliance_rules} entity style.
 */
@Entity
@Table(name = "sla_calendars")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class SlaCalendar {

    @Id
    private String id;
    private String workspaceId;
    @NotBlank
    private String name;
    private String timezone = "Asia/Kolkata";
    @ColumnTransformer(write = "?::jsonb")
    @Column(name = "work_week", columnDefinition = "jsonb")
    private String workWeek = "{}";
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb")
    private String holidays = "[]";
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public String getWorkWeek() { return workWeek; }
    public void setWorkWeek(String workWeek) { this.workWeek = workWeek; }
    public String getHolidays() { return holidays; }
    public void setHolidays(String holidays) { this.holidays = holidays; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
