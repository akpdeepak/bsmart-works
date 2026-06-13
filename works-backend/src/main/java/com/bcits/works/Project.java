package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
import java.time.OffsetDateTime;

/**
 * Declares the central {@code workspaceFilter} once ({@link FilterDef}) and applies it to this
 * entity ({@link Filter}). The filter is enabled per-session by {@link WorkspaceFilterActivator}
 * from {@link TenantContext}, so JPA reads of {@code Project} are narrowed to the bound workspace
 * without re-typing the predicate per query (RB-40 §1). The condition uses the raw column name
 * {@code workspace_id} because Hibernate filter conditions are SQL, not JPQL.
 *
 * <p>This is the proof-of-concept, highest-value read path for the central filter. Other
 * workspace-owned entities adopt the same two annotations incrementally; until they do, their
 * existing explicit scoping remains the guarantee. The filter is dormant unless a workspace is
 * bound, so adding it here cannot regress any existing behaviour.
 */
@Entity
@Table(name = "projects")
@FilterDef(name = WorkspaceFilterActivator.FILTER_NAME,
        parameters = @ParamDef(name = WorkspaceFilterActivator.PARAM_NAME, type = String.class))
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class Project {
    @Id
    private String id;
    private String workspaceId;
    private String name;
    private String keyPrefix;
    @Column(unique = true)
    private String slug;
    private String description;
    private String leadUserId;
    private OffsetDateTime createdAt;
    private boolean isArchived;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getKeyPrefix() { return keyPrefix; }
    public void setKeyPrefix(String keyPrefix) { this.keyPrefix = keyPrefix; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getLeadUserId() { return leadUserId; }
    public void setLeadUserId(String leadUserId) { this.leadUserId = leadUserId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public boolean isArchived() { return isArchived; }
    public void setArchived(boolean archived) { isArchived = archived; }
}
