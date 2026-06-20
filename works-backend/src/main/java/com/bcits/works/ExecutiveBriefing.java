package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * Cap X · AI executive briefing (iteration 16). A schedulable, editable narrative card tailored to a
 * leader's priorities. Workspace-scoped (RB-40 §1). The narrative is regenerated through the AI
 * Control Plane (RB-40 §2) and falls back to the deterministic rollup summary.
 */
@Entity
@Table(name = "executive_briefings")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class ExecutiveBriefing {
    @Id private String id;
    @NotBlank private String workspaceId;
    @NotBlank private String title;
    @Column(columnDefinition = "TEXT") private String focus;
    private String tone = "EXECUTIVE";   // EXECUTIVE | CONVERSATIONAL | TERSE
    private String length = "MEDIUM";    // SHORT | MEDIUM | LONG
    private String cadence = "WEEKLY";   // WEEKLY | MONTHLY | MANUAL
    private String status = "DRAFT";     // DRAFT | PUBLISHED
    private String period;
    @Column(columnDefinition = "TEXT") private String content;
    private OffsetDateTime generatedAt;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getFocus() { return focus; }
    public void setFocus(String focus) { this.focus = focus; }
    public String getTone() { return tone; }
    public void setTone(String tone) { this.tone = tone; }
    public String getLength() { return length; }
    public void setLength(String length) { this.length = length; }
    public String getCadence() { return cadence; }
    public void setCadence(String cadence) { this.cadence = cadence; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public OffsetDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(OffsetDateTime generatedAt) { this.generatedAt = generatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
