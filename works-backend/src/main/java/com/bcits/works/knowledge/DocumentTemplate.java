package com.bcits.works.knowledge;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * A reusable document template (iteration-20 Cap I, Advanced Knowledge): the markdown skeleton —
 * with {@code {{placeholders}}} — that an author starts a new knowledge article from. Workspace-scoped
 * (RB-40 §1): {@code workspace_id} is NOT NULL and every repository finder filters on it, so a template
 * can never be read across the tenant boundary.
 */
@Entity
@Table(name = "document_templates")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class DocumentTemplate {

    @Id private String id;

    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(columnDefinition = "TEXT") private String name;
    @Column(columnDefinition = "TEXT") private String description;
    private String category;
    @Column(columnDefinition = "TEXT") private String body;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
