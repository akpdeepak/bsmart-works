package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.annotations.Filter;

/**
 * Cap Y · A single ordered step of an onboarding/offboarding playbook (iteration 16). Workspace-scoped
 * (RB-40 §1) — denormalized workspace_id so step reads never need to join the playbook.
 */
@Entity
@Table(name = "onboarding_playbook_steps")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class OnboardingPlaybookStep {
    @Id private String id;
    @NotBlank private String playbookId;
    @NotBlank private String workspaceId;
    @NotBlank private String title;
    @Column(columnDefinition = "TEXT") private String description;
    private String actionType = "MANUAL";  // CREATE_USER | ASSIGN_ROLE | ADD_TEAM | PROVISION_INTEGRATION | REVOKE_ACCESS | MANUAL
    private String roleHint;
    private int sortOrder = 0;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPlaybookId() { return playbookId; }
    public void setPlaybookId(String playbookId) { this.playbookId = playbookId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }
    public String getRoleHint() { return roleHint; }
    public void setRoleHint(String roleHint) { this.roleHint = roleHint; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
