package com.bcits.works;

/** Lightweight projection returned by GET /api/v1/articles/search (KR-041, KR-042, KR-043). */
public class ArticleSearchResult {
    private String id;
    private String title;
    private String spaceId;
    private String status;
    private String icon;
    private String templateType;
    private String excerpt; // KR-042: ts_headline snippet with <mark> tags
    private String authorId; // KR-043: included for filter-by-author

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSpaceId() { return spaceId; }
    public void setSpaceId(String spaceId) { this.spaceId = spaceId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getTemplateType() { return templateType; }
    public void setTemplateType(String templateType) { this.templateType = templateType; }
    public String getExcerpt() { return excerpt; }
    public void setExcerpt(String excerpt) { this.excerpt = excerpt; }
    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }
}
