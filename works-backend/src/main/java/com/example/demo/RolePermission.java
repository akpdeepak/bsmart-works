package com.example.demo;

import jakarta.persistence.*;

@Entity
@Table(name = "role_permission")
public class RolePermission {
    @Id private String id;
    private String roleDefId;
    private String permission;
    private Boolean granted = true;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getRoleDefId() { return roleDefId; }
    public void setRoleDefId(String roleDefId) { this.roleDefId = roleDefId; }
    public String getPermission() { return permission; }
    public void setPermission(String permission) { this.permission = permission; }
    public Boolean getGranted() { return granted; }
    public void setGranted(Boolean granted) { this.granted = granted; }
}
