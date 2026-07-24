package com.bcits.works.workspaces;
import com.bcits.works.workspaces.api.Workspace;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Filter;

import java.time.OffsetDateTime;

/**
 * An edge in the people graph: a user holds a {@link Skill} at a proficiency (EPIC-22).
 * Workspace-scoped via the central tenant {@code @Filter} (RB-40 §1).
 */
@Entity
@Table(name = "person_skills")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class PersonSkill {
    @Id
    private String id;
    private String workspaceId;
    @Column(name = "user_id")
    private String userId;
    @Column(name = "skill_id")
    private String skillId;
    private String proficiency;
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getSkillId() { return skillId; }
    public void setSkillId(String skillId) { this.skillId = skillId; }
    public String getProficiency() { return proficiency; }
    public void setProficiency(String proficiency) { this.proficiency = proficiency; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
