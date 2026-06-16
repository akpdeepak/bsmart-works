package com.bcits.works;

import java.util.List;

/** Lightweight projection returned by GET /api/v1/knowledge-spaces/{id}/tree (KR-033). */
public class ArticleTreeNode {
    private String id;
    private String title;
    private String status;
    private String icon;
    private String parentId;
    private Integer sortOrder;
    private String templateType;
    private List<ArticleTreeNode> children;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getParentId() { return parentId; }
    public void setParentId(String parentId) { this.parentId = parentId; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public String getTemplateType() { return templateType; }
    public void setTemplateType(String templateType) { this.templateType = templateType; }
    public List<ArticleTreeNode> getChildren() { return children; }
    public void setChildren(List<ArticleTreeNode> children) { this.children = children; }
}
