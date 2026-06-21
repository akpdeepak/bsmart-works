package com.bcits.works;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "sprints")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "project_id IN (SELECT p.id FROM projects p WHERE p.workspace_id = :workspaceId)")
public class Sprint {
    @Id private String id;
    private String projectId;
    private String name;
    @Column(columnDefinition = "TEXT") private String goal;
    private String status; // PLANNING | ACTIVE | COMPLETED
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer capacity;
    private OffsetDateTime createdAt;

    @Transient private Integer usedPoints = 0;  // actual story points committed to sprint

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public Integer getUsedPoints() { return usedPoints; }
    public void setUsedPoints(Integer usedPoints) { this.usedPoints = usedPoints; }
}
