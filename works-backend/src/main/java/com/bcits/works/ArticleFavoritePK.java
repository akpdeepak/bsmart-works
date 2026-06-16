package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

/** KR-035 — composite primary key for article_favorites. */
@Embeddable
public class ArticleFavoritePK implements Serializable {

    @Column(name = "user_id")
    private String userId;

    @Column(name = "article_id")
    private String articleId;

    public ArticleFavoritePK() {}

    public ArticleFavoritePK(String userId, String articleId) {
        this.userId = userId;
        this.articleId = articleId;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getArticleId() { return articleId; }
    public void setArticleId(String articleId) { this.articleId = articleId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ArticleFavoritePK other)) return false;
        return Objects.equals(userId, other.userId) && Objects.equals(articleId, other.articleId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, articleId);
    }
}
