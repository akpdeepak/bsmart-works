package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "workflow_status")
public class WorkflowStatus {
    @Id private String id;
    private String workflowId;
    private String name;
    private String category = "TODO"; // TODO | IN_PROGRESS | DONE
    private String color = "#94a3b8";
    private Integer position = 0;
    private Boolean isInitial = false;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkflowId() { return workflowId; }
    public void setWorkflowId(String workflowId) { this.workflowId = workflowId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }
    public Boolean getIsInitial() { return isInitial; }
    public void setIsInitial(Boolean isInitial) { this.isInitial = isInitial; }
}
