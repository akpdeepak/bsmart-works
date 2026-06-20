package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "lesson_learned")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class LessonLearned {
    @Id private String id;
    private String workspaceId;
    private String projectId;
    private String title;
    @Column(columnDefinition = "TEXT") private String description;
    private String category; // PROCESS | TECHNICAL | COMMUNICATION | RISK | OTHER
    @Column(columnDefinition = "TEXT") private String whatWorked;
    @Column(columnDefinition = "TEXT") private String whatDidntWork;
    @Column(columnDefinition = "TEXT") private String recommendation;
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb") private String tags = "[]";
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
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getWhatWorked() { return whatWorked; }
    public void setWhatWorked(String whatWorked) { this.whatWorked = whatWorked; }
    public String getWhatDidntWork() { return whatDidntWork; }
    public void setWhatDidntWork(String whatDidntWork) { this.whatDidntWork = whatDidntWork; }
    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }
}
