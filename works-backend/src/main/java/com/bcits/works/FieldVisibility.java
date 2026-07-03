package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "field_visibility")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "field_def_id IN (SELECT fd.id FROM field_def fd WHERE fd.workspace_id = :workspaceId)")
public class FieldVisibility {
    @Id private String id;
    private String fieldDefId;
    private String roleDefId;
    private String visibility = "EDITABLE"; // HIDDEN | READ_ONLY | EDITABLE

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFieldDefId() { return fieldDefId; }
    public void setFieldDefId(String fieldDefId) { this.fieldDefId = fieldDefId; }
    public String getRoleDefId() { return roleDefId; }
    public void setRoleDefId(String roleDefId) { this.roleDefId = roleDefId; }
    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }
}
