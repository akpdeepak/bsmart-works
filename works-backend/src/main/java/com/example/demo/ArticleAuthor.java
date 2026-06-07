package com.example.demo;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

/**
 * A co-author of a knowledge article (iteration-20 Cap I, multi-author collaboration). Each row links
 * a user to an article with a collaboration {@code role} (AUTHOR / CO_AUTHOR / REVIEWER). Workspace-scoped
 * (RB-40 §1): {@code workspace_id} is carried on the row and every finder filters on it, so the roster
 * cannot leak across tenants. Unique per (article, user).
 */
@Entity
@Table(name = "article_authors")
public class ArticleAuthor {

    public static final String AUTHOR    = "AUTHOR";
    public static final String CO_AUTHOR = "CO_AUTHOR";
    public static final String REVIEWER  = "REVIEWER";

    @Id private String id;

    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(name = "article_id")
    private String articleId;

    @Column(name = "user_id")
    private String userId;

    private String role;
    private String addedBy;
    private OffsetDateTime addedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getArticleId() { return articleId; }
    public void setArticleId(String articleId) { this.articleId = articleId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getAddedBy() { return addedBy; }
    public void setAddedBy(String addedBy) { this.addedBy = addedBy; }
    public OffsetDateTime getAddedAt() { return addedAt; }
    public void setAddedAt(OffsetDateTime addedAt) { this.addedAt = addedAt; }
}
