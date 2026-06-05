package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * Voluntary individual sharing (iteration 12, Cap L). An engineer chooses to share their own
 * personal metrics with specific people (e.g. before a 1:1). This is the <em>only</em> path by
 * which one user's individual metrics become visible to another — there is deliberately no
 * manager/admin override. {@code expiresAt == null} means "until revoked".
 */
@Entity
@Table(name = "metric_shares")
public class MetricShare {

    @Id
    private String id;
    private String workspaceId;
    private String ownerId;          // whose metrics are shared
    private String sharedWithId;     // who may view them
    private OffsetDateTime expiresAt;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
    public String getSharedWithId() { return sharedWithId; }
    public void setSharedWithId(String sharedWithId) { this.sharedWithId = sharedWithId; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime expiresAt) { this.expiresAt = expiresAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
