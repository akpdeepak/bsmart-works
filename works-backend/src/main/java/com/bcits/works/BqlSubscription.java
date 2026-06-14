package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * A user's subscription to a saved view (iteration JQL-parity, Batch 5). On its schedule the
 * subscription scheduler runs the view (audited, workspace-scoped) and delivers a summary of the
 * current match count to the chosen channels. One per (saved_view, user).
 */
@Entity
@Table(name = "bql_subscriptions")
public class BqlSubscription {

    /** Delivery cadence. */
    public enum Frequency { DAILY, WEEKLY }

    /** Where the summary is delivered. */
    public enum Channels { IN_APP, EMAIL, BOTH }

    @Id
    private String id;
    private String workspaceId;
    private String savedViewId;
    private String userId;
    private String frequency;   // Frequency.name()
    private String channels;    // Channels.name()
    private boolean active = true;
    private OffsetDateTime lastRunAt;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getSavedViewId() { return savedViewId; }
    public void setSavedViewId(String savedViewId) { this.savedViewId = savedViewId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public String getChannels() { return channels; }
    public void setChannels(String channels) { this.channels = channels; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public OffsetDateTime getLastRunAt() { return lastRunAt; }
    public void setLastRunAt(OffsetDateTime lastRunAt) { this.lastRunAt = lastRunAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
