package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ArticleVersionRepository extends JpaRepository<ArticleVersion, Long> {
    List<ArticleVersion> findByArticleIdOrderByVersionNumberDesc(String articleId);
    Optional<ArticleVersion> findByArticleIdAndVersionNumber(String articleId, Integer versionNumber);
}
