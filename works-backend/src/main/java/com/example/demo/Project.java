package com.example.demo;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "projects")
public class Project {
    @Id
    private String id;
    private String workspaceId;
    private String name;
    private String keyPrefix;
    private String description;
    private String leadUserId;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getKeyPrefix() { return keyPrefix; }
    public void setKeyPrefix(String keyPrefix) { this.keyPrefix = keyPrefix; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getLeadUserId() { return leadUserId; }
    public void setLeadUserId(String leadUserId) { this.leadUserId = leadUserId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
