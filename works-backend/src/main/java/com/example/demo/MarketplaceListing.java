package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * A marketplace extension listing (iteration 20, Cap R) — an entry in the GLOBAL extension catalogue.
 * Listings are browsable by any workspace, but writes are restricted: a workspace may only
 * publish/edit a listing it owns ({@code publisherWorkspaceId} == the publishing workspace). Seeded
 * first-party listings have a NULL {@code publisherWorkspaceId}. {@code requestedScopes} is a
 * comma-separated set of permission scopes the extension asks for; an installing admin grants a
 * subset of them (permission scoping — see {@link InstalledExtension}).
 */
@Entity
@Table(name = "marketplace_listings")
public class MarketplaceListing {

    @Id
    private String id;
    @Column(unique = true)
    private String slug;
    private String name;
    private String summary;
    private String category;
    private String publisher;
    private String version;
    private String icon;
    @Column(name = "requested_scopes")
    private String requestedScopes = "";
    private String status = "DRAFT";
    @Column(name = "publisher_workspace_id")
    private String publisherWorkspaceId;
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getPublisher() { return publisher; }
    public void setPublisher(String publisher) { this.publisher = publisher; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getRequestedScopes() { return requestedScopes; }
    public void setRequestedScopes(String requestedScopes) { this.requestedScopes = requestedScopes; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPublisherWorkspaceId() { return publisherWorkspaceId; }
    public void setPublisherWorkspaceId(String publisherWorkspaceId) { this.publisherWorkspaceId = publisherWorkspaceId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
