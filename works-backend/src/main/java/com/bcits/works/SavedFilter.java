package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "saved_filters")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class SavedFilter {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String workspaceId;
    private String createdBy;
    private String name;
    @Column(columnDefinition = "TEXT") private String filterJson;
    private boolean isShared;
    private OffsetDateTime createdAt;

    public Long getId() { return id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String w) { this.workspaceId = w; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String c) { this.createdBy = c; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getFilterJson() { return filterJson; }
    public void setFilterJson(String f) { this.filterJson = f; }
    public boolean isShared() { return isShared; }
    public void setShared(boolean s) { this.isShared = s; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime c) { this.createdAt = c; }
}
