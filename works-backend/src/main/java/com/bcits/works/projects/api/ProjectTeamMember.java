package com.bcits.works.projects.api;
import com.bcits.works.workspaces.TeamRoleService;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * Cap V · Role-adaptive Sprint Cockpit. WHO a user is on a project (scrum-master, developer,
 * product-owner, executive, admin) — distinct from the RBAC tier, which is WHAT they may do.
 * The role vocabulary is the Today-surface role_key set (V70) so one role language spans
 * surfaces. Resolution with tier fallback lives in {@link TeamRoleService}.
 */
@Entity
@Table(name = "project_team_members")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class ProjectTeamMember {
    @Id private String id;
    private String workspaceId;
    @NotBlank private String projectId;
    @NotBlank private String userId;
    @NotBlank private String roleKey;   // developer | scrum-master | product-owner | executive | admin
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getRoleKey() { return roleKey; }
    public void setRoleKey(String roleKey) { this.roleKey = roleKey; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
