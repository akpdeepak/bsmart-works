package com.bcits.works.workitems;

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
@Table(name = "work_item_links")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "source_id IN (SELECT wi.id FROM work_items wi JOIN projects p ON wi.project_id = p.id WHERE p.workspace_id = "
                + ":workspaceId)")
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
