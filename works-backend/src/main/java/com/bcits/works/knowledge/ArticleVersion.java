package com.bcits.works.knowledge;

import com.bcits.works.shared.WorkspaceFilterActivator;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "article_versions")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "article_id IN (SELECT a.id FROM articles a JOIN knowledge_spaces ks ON a.space_id = ks.id WHERE ks.workspace_id = "
                + ":workspaceId)")
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
