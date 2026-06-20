package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * A customer SLA tier (iteration 9, Cap M): per-workspace response and resolution targets keyed
 * by tier (Platinum 30-min, Gold 2-hour, Silver 8-hour, etc.). A {@link CustomerAccount}'s tier
 * selects the targets applied to its requests. Workspace-scoped.
 */
@Entity
@Table(name = "customer_sla_tiers")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class CustomerSlaTier {

    @Id
    private String id;
    private String workspaceId;
    private String tier;
    private Integer responseMinutes;
    private Integer resolutionMinutes;
    private Boolean active = true;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }
    public Integer getResponseMinutes() { return responseMinutes; }
    public void setResponseMinutes(Integer responseMinutes) { this.responseMinutes = responseMinutes; }
    public Integer getResolutionMinutes() { return resolutionMinutes; }
    public void setResolutionMinutes(Integer resolutionMinutes) { this.resolutionMinutes = resolutionMinutes; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
