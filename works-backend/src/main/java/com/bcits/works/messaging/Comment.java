package com.bcits.works.messaging;

import com.bcits.works.shared.WorkspaceFilterActivator;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.OffsetDateTime;

@Entity
@Table(name = "comments")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "work_item_id IN (SELECT wi.id FROM work_items wi JOIN projects p ON wi.project_id = p.id WHERE p.workspace_id = "
                + ":workspaceId)")
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String workItemId;
    private String authorId;
    private String body;
    private OffsetDateTime createdAt;

    private boolean isInternal;

    private Long parentId;

    @Transient
    private String authorName;
    @Transient
    private java.util.List<Comment> replies = new java.util.ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getWorkItemId() { return workItemId; }
    public void setWorkItemId(String workItemId) { this.workItemId = workItemId; }
    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public boolean isInternal() { return isInternal; }
    public void setInternal(boolean internal) { isInternal = internal; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public Long getParentId() { return parentId; }
    public void setParentId(Long parentId) { this.parentId = parentId; }
    public java.util.List<Comment> getReplies() { return replies; }
    public void setReplies(java.util.List<Comment> replies) { this.replies = replies; }
}
