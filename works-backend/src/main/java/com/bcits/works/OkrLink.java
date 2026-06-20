package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * Cap W · OKR linkage (I15-S12). Joins a {@link KeyResult} to a work item, epic, or theme so
 * delivery rolls up to outcomes. Immutable once created (no updatedAt, no deletedAt); uniqueness is
 * enforced on (key_result_id, entity_type, entity_id).
 */
@Entity
@Table(name = "okr_links")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class OkrLink {
    @Id private String id;
    private String workspaceId;
    private String keyResultId;
    @NotBlank private String entityType; // WORK_ITEM | EPIC | THEME
    @NotBlank private String entityId;
    private String createdBy;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getKeyResultId() { return keyResultId; }
    public void setKeyResultId(String keyResultId) { this.keyResultId = keyResultId; }
    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }
    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
