package com.bcits.works.knowledge;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ArticleVersionRepository extends JpaRepository<ArticleVersion, Long> {
    List<ArticleVersion> findByArticleIdOrderByVersionNumberDesc(String articleId);
    Page<ArticleVersion> findByArticleIdOrderByVersionNumberDesc(String articleId, Pageable pageable);
    Optional<ArticleVersion> findByArticleIdAndVersionNumber(String articleId, Integer versionNumber);
}
