package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "stakeholder")
public class Stakeholder {
    @Id private String id;
    private String workspaceId;
    private String projectId;
    private String name;
    private String role;
    private String organization;
    private String email;
    private String influence = "MEDIUM";          // LOW | MEDIUM | HIGH
    private String interest = "MEDIUM";            // LOW | MEDIUM | HIGH
    private String engagementStrategy = "INFORM";  // INFORM | CONSULT | INVOLVE | COLLABORATE | EMPOWER
    private String communicationFreq = "MONTHLY";  // DAILY | WEEKLY | BIWEEKLY | MONTHLY | QUARTERLY
    private LocalDate lastContactedAt;
    @Column(columnDefinition = "TEXT") private String notes;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime deletedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getInfluence() { return influence; }
    public void setInfluence(String influence) { this.influence = influence; }
    public String getInterest() { return interest; }
    public void setInterest(String interest) { this.interest = interest; }
    public String getEngagementStrategy() { return engagementStrategy; }
    public void setEngagementStrategy(String engagementStrategy) { this.engagementStrategy = engagementStrategy; }
    public String getCommunicationFreq() { return communicationFreq; }
    public void setCommunicationFreq(String communicationFreq) { this.communicationFreq = communicationFreq; }
    public LocalDate getLastContactedAt() { return lastContactedAt; }
    public void setLastContactedAt(LocalDate lastContactedAt) { this.lastContactedAt = lastContactedAt; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }
}
