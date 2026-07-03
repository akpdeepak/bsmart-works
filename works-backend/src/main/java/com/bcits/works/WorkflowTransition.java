package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.ColumnTransformer;

@Entity
@Table(name = "workflow_transition")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "workflow_id IN (SELECT w.id FROM workflow w WHERE w.workspace_id = :workspaceId)")
public class WorkflowTransition {
    @Id private String id;
    private String workflowId;
    private String fromStatus;
    private String toStatus;
    private String name;
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb") private String conditions = "[]";
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb") private String validators = "[]";
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb") private String postFunctions = "[]";

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkflowId() { return workflowId; }
    public void setWorkflowId(String workflowId) { this.workflowId = workflowId; }
    public String getFromStatus() { return fromStatus; }
    public void setFromStatus(String fromStatus) { this.fromStatus = fromStatus; }
    public String getToStatus() { return toStatus; }
    public void setToStatus(String toStatus) { this.toStatus = toStatus; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getConditions() { return conditions; }
    public void setConditions(String conditions) { this.conditions = conditions; }
    public String getValidators() { return validators; }
    public void setValidators(String validators) { this.validators = validators; }
    public String getPostFunctions() { return postFunctions; }
    public void setPostFunctions(String postFunctions) { this.postFunctions = postFunctions; }
}
