package com.bcits.works.projects.api;
import com.bcits.works.projects.ProjectFramework;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Filter;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.time.OffsetDateTime;

/**
 * Applies the central {@code workspaceFilter} to this entity ({@link Filter}). The canonical
 * {@code @FilterDef} is declared once at package scope (see {@code package-info.java}); this class
 * only references it by name via the {@link WorkspaceFilterActivator} constants, so the definition
 * is never duplicated. The filter is enabled per-session by {@link WorkspaceFilterActivator} from
 * {@link TenantContext}, so JPA reads of {@code Project} are narrowed to the bound workspace without
 * re-typing the predicate per query (RB-40 §1). The condition uses the raw column name
 * {@code workspace_id} because Hibernate filter conditions are SQL, not JPQL.
 *
 * <p>This is the proof-of-concept, highest-value read path for the central filter. Other
 * workspace-owned entities adopt the same single {@code @Filter} annotation incrementally; until
 * they do, their existing explicit scoping remains the guarantee. The filter is dormant unless a
 * workspace is bound, so adding it here cannot regress any existing behaviour.
 */
@Entity
@Table(name = "projects")
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
    
    @Enumerated(EnumType.STRING)
    private ProjectFramework framework;

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
    public ProjectFramework getFramework() { return framework; }
    public void setFramework(ProjectFramework framework) { this.framework = framework; }
}
