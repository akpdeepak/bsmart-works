package com.bcits.works.auth.api;
import com.bcits.works.workspaces.api.Workspace;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/** A workspace conditional-access policy: IP/geo allow-lists, device-trust, time-of-day window,
 *  optionally scoped to one role (iteration 19 Cap T, RB-40 §4). Workspace-scoped (RB-40 §1). */
@Entity
@Table(name = "conditional_access_policies")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class ConditionalAccessPolicy {

    @Id
    private String id;

    @Column(name = "workspace_id")
    private String workspaceId;

    private String name;

    private boolean enabled = true;

    @Column(name = "applies_to_role")
    private String appliesToRole;

    @Column(name = "ip_allowlist")
    private String ipAllowlist;

    @Column(name = "geo_allowlist")
    private String geoAllowlist;

    @Column(name = "require_device_trust")
    private boolean requireDeviceTrust = false;

    @Column(name = "time_zone")
    private String timeZone = "UTC";

    @Column(name = "allowed_start_minute")
    private Integer allowedStartMinute;

    @Column(name = "allowed_end_minute")
    private Integer allowedEndMinute;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getAppliesToRole() { return appliesToRole; }
    public void setAppliesToRole(String appliesToRole) { this.appliesToRole = appliesToRole; }
    public String getIpAllowlist() { return ipAllowlist; }
    public void setIpAllowlist(String ipAllowlist) { this.ipAllowlist = ipAllowlist; }
    public String getGeoAllowlist() { return geoAllowlist; }
    public void setGeoAllowlist(String geoAllowlist) { this.geoAllowlist = geoAllowlist; }
    public boolean isRequireDeviceTrust() { return requireDeviceTrust; }
    public void setRequireDeviceTrust(boolean requireDeviceTrust) { this.requireDeviceTrust = requireDeviceTrust; }
    public String getTimeZone() { return timeZone; }
    public void setTimeZone(String timeZone) { this.timeZone = timeZone; }
    public Integer getAllowedStartMinute() { return allowedStartMinute; }
    public void setAllowedStartMinute(Integer allowedStartMinute) { this.allowedStartMinute = allowedStartMinute; }
    public Integer getAllowedEndMinute() { return allowedEndMinute; }
    public void setAllowedEndMinute(Integer allowedEndMinute) { this.allowedEndMinute = allowedEndMinute; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
