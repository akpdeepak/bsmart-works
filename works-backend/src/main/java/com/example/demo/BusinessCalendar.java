package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * A business-hours calendar (iteration 8, Cap M). Drives SLA clocks so time outside
 * working windows, weekends and holidays does not count against a target. {@code workWeek}
 * is a JSON object keyed by day (MON…SUN) of {@code {"start","end"}}; an absent day is
 * non-working. {@code holidays} is a JSON array of full non-working dates. Mirrors the
 * {@code compliance_rules} entity style.
 */
@Entity
@Table(name = "business_calendars")
public class BusinessCalendar {

    @Id
    private String id;
    private String workspaceId;
    @NotBlank
    private String name;
    private String timezone = "Asia/Kolkata";
    @Column(name = "work_week", columnDefinition = "jsonb")
    private String workWeek = "{}";
    @Column(columnDefinition = "jsonb")
    private String holidays = "[]";
    private Boolean isDefault = false;
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
    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
