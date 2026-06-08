package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * A cached AI response (RB-40 §2). Repeated prompts within a workspace+capability are served from
 * here without re-spending budget. The cache is workspace-scoped (RB-40 §1) so one tenant's
 * responses are never served to another.
 */
@Entity
@Table(name = "ai_cache_entries")
public class AiCacheEntry {

    @Id
    private String id;          // workspace : capability : key-hash
    private String workspaceId;
    private String capability;
    private String cacheKey;
    @jakarta.persistence.Column(columnDefinition = "TEXT")
    private String response;
    private String modelTier;
    private Integer hits = 0;
    private OffsetDateTime createdAt;
    private OffsetDateTime expiresAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getCapability() { return capability; }
    public void setCapability(String capability) { this.capability = capability; }
    public String getCacheKey() { return cacheKey; }
    public void setCacheKey(String cacheKey) { this.cacheKey = cacheKey; }
    public String getResponse() { return response; }
    public void setResponse(String response) { this.response = response; }
    public String getModelTier() { return modelTier; }
    public void setModelTier(String modelTier) { this.modelTier = modelTier; }
    public Integer getHits() { return hits; }
    public void setHits(Integer hits) { this.hits = hits; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime expiresAt) { this.expiresAt = expiresAt; }
}
