package com.example.demo;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "saved_filters")
public class SavedFilter {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String workspaceId;
    private String createdBy;
    private String name;
    @Column(columnDefinition = "TEXT") private String filterJson;
    private boolean isShared;
    private OffsetDateTime createdAt;
    private boolean subscribed;
    private OffsetDateTime lastNotifiedAt;

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
    public boolean isSubscribed() { return subscribed; }
    public void setSubscribed(boolean s) { this.subscribed = s; }
    public OffsetDateTime getLastNotifiedAt() { return lastNotifiedAt; }
    public void setLastNotifiedAt(OffsetDateTime l) { this.lastNotifiedAt = l; }
}
