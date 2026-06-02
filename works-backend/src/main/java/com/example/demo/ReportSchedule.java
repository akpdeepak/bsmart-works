package com.example.demo;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * A scheduled delivery of a {@link Report} (iteration 6). On its cadence the
 * {@code ReportDeliveryScheduler} notifies the recipients that the report is ready.
 */
@Entity
@Table(name = "report_schedules")
public class ReportSchedule {
    @Id private String id;
    @NotBlank
    private String reportId;
    private String ownerId;
    private String cadence;     // DAILY | WEEKLY | MONTHLY
    private String channel;     // IN_APP | EMAIL | BOTH
    private String recipients;  // comma-separated user ids
    private OffsetDateTime nextRunAt;
    private OffsetDateTime lastRunAt;
    private Boolean active = true;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getReportId() { return reportId; }
    public void setReportId(String reportId) { this.reportId = reportId; }
    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
    public String getCadence() { return cadence; }
    public void setCadence(String cadence) { this.cadence = cadence; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public String getRecipients() { return recipients; }
    public void setRecipients(String recipients) { this.recipients = recipients; }
    public OffsetDateTime getNextRunAt() { return nextRunAt; }
    public void setNextRunAt(OffsetDateTime nextRunAt) { this.nextRunAt = nextRunAt; }
    public OffsetDateTime getLastRunAt() { return lastRunAt; }
    public void setLastRunAt(OffsetDateTime lastRunAt) { this.lastRunAt = lastRunAt; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
