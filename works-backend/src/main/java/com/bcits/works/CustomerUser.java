package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * An external customer-portal user (iteration 9, Cap N) — a SEPARATE identity from the internal
 * {@code users} table, with its own login flow. Belongs to a {@link CustomerAccount} and is
 * tenant-scoped by {@code workspaceId}. Never granted internal workspace membership.
 */
@Entity
@Table(name = "customer_users")
public class CustomerUser {

    @Id
    private String id;
    private String customerAccountId;
    private String workspaceId;
    private String email;
    private String passwordHash;
    private String displayName;
    private Boolean isAccountAdmin = false;
    private Boolean active = true;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCustomerAccountId() { return customerAccountId; }
    public void setCustomerAccountId(String customerAccountId) { this.customerAccountId = customerAccountId; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public Boolean getIsAccountAdmin() { return isAccountAdmin; }
    public void setIsAccountAdmin(Boolean isAccountAdmin) { this.isAccountAdmin = isAccountAdmin; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
