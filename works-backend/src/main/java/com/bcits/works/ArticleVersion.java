package com.bcits.works;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "article_versions")
public class ArticleVersion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String articleId;
    private Integer versionNumber;
    @Column(columnDefinition = "TEXT") private String title;
    @Column(columnDefinition = "TEXT") private String content;
    private String savedBy;
    private OffsetDateTime savedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getArticleId() { return articleId; }
    public void setArticleId(String articleId) { this.articleId = articleId; }
    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getSavedBy() { return savedBy; }
    public void setSavedBy(String savedBy) { this.savedBy = savedBy; }
    public OffsetDateTime getSavedAt() { return savedAt; }
    public void setSavedAt(OffsetDateTime savedAt) { this.savedAt = savedAt; }
}
