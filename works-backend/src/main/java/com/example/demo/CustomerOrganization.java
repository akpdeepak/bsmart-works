package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

/**
 * A customer organization (iteration 9, Cap N) — one of a tenant's external customers (e.g. a
 * DISCOM that BCITS serves). It owns the white-label portal branding ({@code subdomain},
 * {@code logoUrl}, {@code primaryColor}) and the {@code tier} (PLATINUM | GOLD | SILVER) that
 * selects which multi-tier SLA policies govern its requests. Belongs to a workspace (the tenant);
 * every lookup is workspace-scoped (RB-40 §1). Mirrors the {@code sla_policies} entity style.
 */
@Entity
@Table(name = "customer_organizations")
public class CustomerOrganization {

    @Id
    private String id;
    private String workspaceId;
    @NotBlank
    private String name;
    private String tier = "SILVER";
    private String subdomain;
    private String logoUrl;
    private String primaryColor;
    private Boolean active = true;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }
    public String getSubdomain() { return subdomain; }
    public void setSubdomain(String subdomain) { this.subdomain = subdomain; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public String getPrimaryColor() { return primaryColor; }
    public void setPrimaryColor(String primaryColor) { this.primaryColor = primaryColor; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
