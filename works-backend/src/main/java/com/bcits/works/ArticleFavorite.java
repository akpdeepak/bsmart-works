package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** KR-035 — starred/favorite article for a user, workspace-scoped. */
@Entity
@Table(name = "article_favorites")
public class ArticleFavorite {

    @EmbeddedId
    private ArticleFavoritePK id;

    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public ArticleFavoritePK getId() { return id; }
    public void setId(ArticleFavoritePK id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
