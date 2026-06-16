package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.ColumnTransformer;

@Entity
@Table(name = "articles")
public class Article {
    @Id private String id;
    private String spaceId;
    private String parentId;
    @Column(columnDefinition = "TEXT") private String title;
    @Column(columnDefinition = "TEXT") private String content;
    private String templateType; // RUNBOOK | ADR | POSTMORTEM | ONBOARDING | KB | TROUBLESHOOTING | CUSTOM
    private String status;       // DRAFT | IN_REVIEW | PUBLISHED | ARCHIVED
    private String authorId;
    private String reviewerId;
    private OffsetDateTime submittedAt;
    private OffsetDateTime publishedAt;
    private Integer versionNumber;
    private Integer helpfulVotes;
    private Integer viewCount;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private Boolean portalPublished = false; // iteration 9: surfaced on the customer portal KB

    // KR-009: cover image (HTTPS URL or gradient key e.g. "gradient:brand-navy-to-orange")
    @Column(name = "cover_image", length = 500) private String coverImage;

    // KR-010: article icon — emoji string ("📝") or Lucide icon name ("lucide:FileText")
    @Column(name = "icon", length = 50) private String icon;

    // B09: block-based editor (iteration 20, Cap I)
    // content_format: 'markdown' (default) | 'blocks' (JSON block array in content_blocks)
    // KR-033: drag-to-reorder position within the parent in the page tree sidebar
    @Column(name = "sort_order") private Integer sortOrder;

    @Column(name = "content_format", nullable = false)
    private String contentFormat = "markdown";

    // Block data when content_format = 'blocks'. Block types: paragraph, heading, code, image,
    // embed, mermaid, table, divider. Must be non-empty when content_format = 'blocks'.
    @ColumnTransformer(write = "?::jsonb")
    @Column(name = "content_blocks", columnDefinition = "jsonb")
    private String contentBlocks;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSpaceId() { return spaceId; }
    public void setSpaceId(String spaceId) { this.spaceId = spaceId; }
    public String getParentId() { return parentId; }
    public void setParentId(String parentId) { this.parentId = parentId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getTemplateType() { return templateType; }
    public void setTemplateType(String templateType) { this.templateType = templateType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }
    public String getReviewerId() { return reviewerId; }
    public void setReviewerId(String reviewerId) { this.reviewerId = reviewerId; }
    public OffsetDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(OffsetDateTime submittedAt) { this.submittedAt = submittedAt; }
    public OffsetDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(OffsetDateTime publishedAt) { this.publishedAt = publishedAt; }
    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }
    public Integer getHelpfulVotes() { return helpfulVotes; }
    public void setHelpfulVotes(Integer helpfulVotes) { this.helpfulVotes = helpfulVotes; }
    public Integer getViewCount() { return viewCount; }
    public void setViewCount(Integer viewCount) { this.viewCount = viewCount; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public Boolean getPortalPublished() { return portalPublished; }
    public void setPortalPublished(Boolean portalPublished) { this.portalPublished = portalPublished; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getContentFormat() { return contentFormat; }
    public void setContentFormat(String contentFormat) { this.contentFormat = contentFormat; }
    public String getContentBlocks() { return contentBlocks; }
    public void setContentBlocks(String contentBlocks) { this.contentBlocks = contentBlocks; }
}
