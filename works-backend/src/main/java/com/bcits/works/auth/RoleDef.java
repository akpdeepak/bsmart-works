package com.bcits.works.auth;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "role_def")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class RoleDef {
    @Id private String id;
    private String workspaceId;
    private String permissionSchemeId;
    private String name;
    @Column(columnDefinition = "TEXT") private String description;
    private Integer tier = 2;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getPermissionSchemeId() { return permissionSchemeId; }
    public void setPermissionSchemeId(String permissionSchemeId) { this.permissionSchemeId = permissionSchemeId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getTier() { return tier; }
    public void setTier(Integer tier) { this.tier = tier; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
