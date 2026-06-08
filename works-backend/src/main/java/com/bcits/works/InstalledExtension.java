package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * A marketplace extension installed into a workspace (iteration 20, Cap R). Workspace-scoped
 * (RB-40 §1): {@code workspaceId} is NOT NULL and every query filters on it. {@code grantedScopes}
 * is the comma-separated subset of the listing's requested scopes the installing admin approved —
 * the permission scoping the extension is bound to. One install per (workspace, listing).
 */
@Entity
@Table(name = "installed_extensions")
public class InstalledExtension {

    @Id
    private String id;
    @Column(name = "workspace_id")
    private String workspaceId;
    @Column(name = "listing_id")
    private String listingId;
    @Column(name = "granted_scopes")
    private String grantedScopes = "";
    private Boolean enabled = true;
    @Column(name = "installed_by")
    private String installedBy;
    @Column(name = "installed_at")
    private OffsetDateTime installedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getListingId() { return listingId; }
    public void setListingId(String listingId) { this.listingId = listingId; }
    public String getGrantedScopes() { return grantedScopes; }
    public void setGrantedScopes(String grantedScopes) { this.grantedScopes = grantedScopes; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getInstalledBy() { return installedBy; }
    public void setInstalledBy(String installedBy) { this.installedBy = installedBy; }
    public OffsetDateTime getInstalledAt() { return installedAt; }
    public void setInstalledAt(OffsetDateTime installedAt) { this.installedAt = installedAt; }
}
