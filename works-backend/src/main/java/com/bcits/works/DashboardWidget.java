package com.bcits.works;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import org.hibernate.annotations.ColumnTransformer;

@Entity
@Table(name = "dashboard_widgets")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "dashboard_id IN (SELECT d.id FROM dashboards d WHERE d.workspace_id = :workspaceId)")
public class DashboardWidget {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String dashboardId;
    @NotBlank
    private String widgetType;
    private String title;
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb")
    private String config = "{}";
    @Column(name = "grid_x")
    private Integer gridX;
    @Column(name = "grid_y")
    private Integer gridY;
    @Column(name = "grid_w")
    private Integer gridW;
    @Column(name = "grid_h")
    private Integer gridH;
    private Integer position;
    private OffsetDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDashboardId() { return dashboardId; }
    public void setDashboardId(String dashboardId) { this.dashboardId = dashboardId; }
    public String getWidgetType() { return widgetType; }
    public void setWidgetType(String widgetType) { this.widgetType = widgetType; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getConfig() { return config; }
    public void setConfig(String config) { this.config = config; }
    public Integer getGridX() { return gridX; }
    public void setGridX(Integer gridX) { this.gridX = gridX; }
    public Integer getGridY() { return gridY; }
    public void setGridY(Integer gridY) { this.gridY = gridY; }
    public Integer getGridW() { return gridW; }
    public void setGridW(Integer gridW) { this.gridW = gridW; }
    public Integer getGridH() { return gridH; }
    public void setGridH(Integer gridH) { this.gridH = gridH; }
    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
