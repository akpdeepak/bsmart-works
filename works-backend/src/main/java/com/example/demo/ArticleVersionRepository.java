package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ArticleVersionRepository extends JpaRepository<ArticleVersion, Long> {
    List<ArticleVersion> findByArticleIdOrderByVersionNumberDesc(String articleId);
}
