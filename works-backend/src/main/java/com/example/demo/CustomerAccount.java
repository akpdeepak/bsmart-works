package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * An external customer identity (iteration 9, Cap N) — the person who signs into a customer
 * organization's branded portal to raise and track requests. SEPARATE from the internal
 * {@code users} table: a customer account belongs to a {@link CustomerOrganization}, which belongs
 * to a workspace (the tenant), and its email lives in its own namespace per workspace. The password
 * is BCrypt-hashed exactly like internal auth ({@code AuthController}); the issued JWT carries a
 * {@code portal} claim so the portal endpoints never confuse a customer for an internal user.
 * Every lookup is workspace- and organization-scoped (RB-40 §1). Mirrors the {@code sla_policies}
 * entity style.
 */
@Entity
@Table(name = "customer_accounts")
public class CustomerAccount {

    @Id
    private String id;
    private String workspaceId;
    private String organizationId;
    private String email;
    @Column(name = "password_hash", columnDefinition = "TEXT")
    private String passwordHash;
    private String fullName;
    private Boolean active = true;
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getOrganizationId() { return organizationId; }
    public void setOrganizationId(String organizationId) { this.organizationId = organizationId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
