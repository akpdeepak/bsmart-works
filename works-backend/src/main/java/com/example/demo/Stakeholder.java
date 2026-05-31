package com.example.demo;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "stakeholders")
public class Stakeholder {
    @Id private String id;
    private String projectId;
    @Column(columnDefinition = "TEXT") private String name;
    private String role;
    private String email;
    private String influence;              // LOW | MEDIUM | HIGH
    private String interest;               // LOW | MEDIUM | HIGH
    private String communicationFrequency; // DAILY | WEEKLY | BIWEEKLY | MONTHLY | QUARTERLY
    private LocalDate lastContactedAt;
    @Column(columnDefinition = "TEXT") private String notes;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getInfluence() { return influence; }
    public void setInfluence(String influence) { this.influence = influence; }
    public String getInterest() { return interest; }
    public void setInterest(String interest) { this.interest = interest; }
    public String getCommunicationFrequency() { return communicationFrequency; }
    public void setCommunicationFrequency(String communicationFrequency) { this.communicationFrequency = communicationFrequency; }
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
}
