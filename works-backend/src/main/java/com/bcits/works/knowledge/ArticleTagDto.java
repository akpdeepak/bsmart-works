package com.bcits.works.knowledge;

/** KR-034 — DTO for article tag responses. */
public class ArticleTagDto {
    private String id;
    private String workspaceId;
    private String name;
    private String color;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}
