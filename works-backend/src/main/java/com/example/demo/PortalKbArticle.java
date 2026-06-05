package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * A knowledge-base article published to the customer portal (iteration 9, Cap N) — the customer-
 * facing subset of the internal KB. Publishing snapshots the title/body so portal readers never
 * reach into the internal article (and a later internal edit does not silently change what the
 * customer saw); {@code articleId} keeps the provenance link. Unpublishing simply deletes the row.
 * Workspace-scoped (RB-40 §1); publishing/unpublishing is gated by {@code manage_service}, while the
 * portal read is organization-scoped to the customer's workspace. Mirrors the entity style above.
 */
@Entity
@Table(name = "portal_kb_articles")
public class PortalKbArticle {

    @Id
    private String id;
    private String workspaceId;
    private String articleId;            // source internal article (provenance)
    @NotBlank
    private String title;
    @Column(columnDefinition = "TEXT")
    private String body;
    private String publishedBy;
    private OffsetDateTime publishedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getArticleId() { return articleId; }
    public void setArticleId(String articleId) { this.articleId = articleId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getPublishedBy() { return publishedBy; }
    public void setPublishedBy(String publishedBy) { this.publishedBy = publishedBy; }
    public OffsetDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(OffsetDateTime publishedAt) { this.publishedAt = publishedAt; }
}
