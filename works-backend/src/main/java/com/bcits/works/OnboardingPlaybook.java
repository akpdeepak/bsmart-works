package com.bcits.works;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * Cap Y · User lifecycle automation (iteration 16). An onboarding/offboarding playbook — a named,
 * ordered set of role-aware steps. Workspace-scoped (RB-40 §1).
 */
@Entity
@Table(name = "onboarding_playbooks")
public class OnboardingPlaybook {
    @Id private String id;
    @NotBlank private String workspaceId;
    @NotBlank private String name;
    @Column(columnDefinition = "TEXT") private String description;
    private String kind = "ONBOARD";  // ONBOARD | OFFBOARD
    private boolean active = true;
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
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
