package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "knowledge_spaces")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class KnowledgeSpace {
    @Id private String id;
    private String workspaceId;
    @Column(columnDefinition = "TEXT") private String name;
    @Column(columnDefinition = "TEXT") private String description;
    private String icon;
    private String visibility; // PUBLIC | TEAM | PRIVATE
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // KR-037: optional designated "home" article — opening the space auto-navigates to it.
    // TEXT FK to articles(id); ON DELETE SET NULL in V103. Null = no home article set.
    @Column(name = "home_article_id")
    private String homeArticleId;

    // KR-019: number of APPROVED decisions required before an article auto-publishes (default 1).
    // Added by V108.
    @Column(name = "required_approvals")
    private Integer requiredApprovals = 1;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getHomeArticleId() { return homeArticleId; }
    public void setHomeArticleId(String homeArticleId) { this.homeArticleId = homeArticleId; }
    public Integer getRequiredApprovals() { return requiredApprovals; }
    public void setRequiredApprovals(Integer requiredApprovals) { this.requiredApprovals = requiredApprovals; }
}
