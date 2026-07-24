package com.bcits.works.workspaces;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

import org.hibernate.annotations.Filter;

/**
 * Operating Model Policy (V1.6 Foundational Reframe)
 * Allows Admins/Owners to govern actions per strict User Type.
 */
@Entity
@Table(name = "operating_model_policies")
@Filter(name = "workspaceFilter", condition = "workspace_id = :workspaceId")
public class OperatingModelPolicy {
    @Id
    private String id;
    
    @Column(name = "workspace_id")
    private String workspaceId;
    
    @Column(name = "user_type")
    private String userType; // INDIVIDUAL, TEAM_LEAD, MANAGEMENT, ADMIN, OWNER
    
    @Column(name = "resource_type")
    private String resourceType; // work_item, project, sprint, policy
    
    @Column(name = "action_name")
    private String actionName; // create, update, delete, manage
    
    @Column(name = "is_allowed")
    private boolean isAllowed;
    
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
    
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getUserType() { return userType; }
    public void setUserType(String userType) { this.userType = userType; }
    public String getResourceType() { return resourceType; }
    public void setResourceType(String resourceType) { this.resourceType = resourceType; }
    public String getActionName() { return actionName; }
    public void setActionName(String actionName) { this.actionName = actionName; }
    public boolean isAllowed() { return isAllowed; }
    public void setAllowed(boolean allowed) { isAllowed = allowed; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
