package com.bcits.works.workspaces;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.Filter;

/**
 * A team (iteration 6) — a named, configurable set of projects within a workspace.
 * Backs TEAM-scoped aggregation. {@code projectIds} is a JSONB array of project ids.
 */
@Entity
@Table(name = "teams")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class Team {
    @Id private String id;
    private String workspaceId;
    @NotBlank
    private String name;
    private String description;
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb")
    private String projectIds = "[]";
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    
    // V1.6 Foundational Reframe fields
    private String framework = "SCRUM";
    private String teamKey;
    private int nextSeq = 1;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getProjectIds() { return projectIds; }
    public void setProjectIds(String projectIds) { this.projectIds = projectIds; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    
    public String getFramework() { return framework; }
    public void setFramework(String framework) { this.framework = framework; }
    public String getTeamKey() { return teamKey; }
    public void setTeamKey(String teamKey) { this.teamKey = teamKey; }
    public int getNextSeq() { return nextSeq; }
    public void setNextSeq(int nextSeq) { this.nextSeq = nextSeq; }
}
