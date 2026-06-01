package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ArticleCommentRepository extends JpaRepository<ArticleComment, Long> {
    List<ArticleComment> findByArticleIdOrderByCreatedAtAsc(String articleId);
    long countByArticleIdAndResolvedFalse(String articleId);
}
