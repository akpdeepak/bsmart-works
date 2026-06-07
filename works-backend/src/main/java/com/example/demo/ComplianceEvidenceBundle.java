package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/** A one-click compliance evidence bundle (SOC 2 Type 2 / ISO 27001) for a reporting period
 *  (iteration 19 Cap T). Status moves BUILDING → READY → DOWNLOADED. Workspace-scoped (RB-40 §1). */
@Entity
@Table(name = "compliance_evidence_bundles")
public class ComplianceEvidenceBundle {

    @Id
    private String id;

    @Column(name = "workspace_id")
    private String workspaceId;

    private String framework;   // SOC2_TYPE2 | ISO_27001

    private String status = "BUILDING";   // BUILDING | READY | DOWNLOADED

    @Column(name = "period_start")
    private LocalDate periodStart;

    @Column(name = "period_end")
    private LocalDate periodEnd;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "generated_by")
    private String generatedBy;

    @Column(name = "generated_at")
    private OffsetDateTime generatedAt;

    @Column(name = "downloaded_at")
    private OffsetDateTime downloadedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getFramework() { return framework; }
    public void setFramework(String framework) { this.framework = framework; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDate getPeriodStart() { return periodStart; }
    public void setPeriodStart(LocalDate periodStart) { this.periodStart = periodStart; }
    public LocalDate getPeriodEnd() { return periodEnd; }
    public void setPeriodEnd(LocalDate periodEnd) { this.periodEnd = periodEnd; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getGeneratedBy() { return generatedBy; }
    public void setGeneratedBy(String generatedBy) { this.generatedBy = generatedBy; }
    public OffsetDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(OffsetDateTime generatedAt) { this.generatedAt = generatedAt; }
    public OffsetDateTime getDownloadedAt() { return downloadedAt; }
    public void setDownloadedAt(OffsetDateTime downloadedAt) { this.downloadedAt = downloadedAt; }
}
