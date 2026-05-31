package com.example.demo;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "work_item_links")
public class WorkItemLink {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String sourceId;
    private String targetId;
    private String linkType; // BLOCKS | BLOCKED_BY | RELATES_TO | DUPLICATES | PARENT | CHILD
    private OffsetDateTime createdAt;

    @Transient private String targetTitle;

    public Long getId() { return id; }
    public String getSourceId() { return sourceId; }
    public void setSourceId(String sourceId) { this.sourceId = sourceId; }
    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }
    public String getLinkType() { return linkType; }
    public void setLinkType(String linkType) { this.linkType = linkType; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public String getTargetTitle() { return targetTitle; }
    public void setTargetTitle(String targetTitle) { this.targetTitle = targetTitle; }
}
