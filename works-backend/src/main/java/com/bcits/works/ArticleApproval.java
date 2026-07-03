package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * KR-019: Records a reviewer's approval decision on an article.
 * Decisions: APPROVED | CHANGES_REQUESTED.
 * An article auto-publishes once the count of APPROVED rows >= knowledge_spaces.required_approvals.
 * workspace_id is denormalised onto every row for workspace-scoped queries (RB-40 §1).
 */
@Entity
@Table(name = "article_approvals")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class ArticleApproval {

    @Id private String id;
    @Column(name = "article_id",   nullable = false) private String articleId;
    @Column(name = "reviewer_id",  nullable = false) private String reviewerId;
    @Column(name = "workspace_id", nullable = false) private String workspaceId;
    @Column(name = "decision",     nullable = false) private String decision; // APPROVED | CHANGES_REQUESTED
    @Column(columnDefinition = "TEXT") private String comment;
    @Column(name = "created_at",   nullable = false) private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getArticleId() { return articleId; }
    public void setArticleId(String articleId) { this.articleId = articleId; }
    public String getReviewerId() { return reviewerId; }
    public void setReviewerId(String reviewerId) { this.reviewerId = reviewerId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
