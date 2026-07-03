package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * A voluntary individual-metrics share (iteration 12, Cap L). The owner chooses to expose THEIR OWN
 * personal metrics to one specific viewer (e.g. a manager before a 1:1). This is the only mechanism
 * by which one user's individual metrics become visible to another — managers can never drill into
 * individuals otherwise (RB-40 §1, commitment 4).
 */
@Entity
@Table(name = "metric_shares")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class MetricShare {

    @Id
    private String id;
    private String workspaceId;
    private String ownerUserId;
    private String viewerUserId;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getOwnerUserId() { return ownerUserId; }
    public void setOwnerUserId(String ownerUserId) { this.ownerUserId = ownerUserId; }
    public String getViewerUserId() { return viewerUserId; }
    public void setViewerUserId(String viewerUserId) { this.viewerUserId = viewerUserId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
