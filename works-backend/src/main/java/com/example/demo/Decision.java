package com.example.demo;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "decisions")
public class Decision {
    @Id private String id;
    private String projectId;
    @Column(columnDefinition = "TEXT") private String title;
    @Column(columnDefinition = "TEXT") private String decisionText;
    @Column(columnDefinition = "TEXT") private String alternativesConsidered;
    @Column(columnDefinition = "TEXT") private String rationale;
    private LocalDate decidedAt;
    private String ownerId;
    @Column(columnDefinition = "TEXT") private String supportingLinks;
    private String relatedRiskIds;
    private String status; // ACTIVE | SUPERSEDED | REVOKED
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDecisionText() { return decisionText; }
    public void setDecisionText(String decisionText) { this.decisionText = decisionText; }
    public String getAlternativesConsidered() { return alternativesConsidered; }
    public void setAlternativesConsidered(String alternativesConsidered) { this.alternativesConsidered = alternativesConsidered; }
    public String getRationale() { return rationale; }
    public void setRationale(String rationale) { this.rationale = rationale; }
    public LocalDate getDecidedAt() { return decidedAt; }
    public void setDecidedAt(LocalDate decidedAt) { this.decidedAt = decidedAt; }
    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
    public String getSupportingLinks() { return supportingLinks; }
    public void setSupportingLinks(String supportingLinks) { this.supportingLinks = supportingLinks; }
    public String getRelatedRiskIds() { return relatedRiskIds; }
    public void setRelatedRiskIds(String relatedRiskIds) { this.relatedRiskIds = relatedRiskIds; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
