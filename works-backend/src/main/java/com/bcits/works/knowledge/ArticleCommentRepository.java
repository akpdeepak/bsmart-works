package com.bcits.works.knowledge;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ArticleCommentRepository extends JpaRepository<ArticleComment, Long> {
    List<ArticleComment> findByArticleIdOrderByCreatedAtAsc(String articleId);
    Page<ArticleComment> findByArticleIdOrderByCreatedAtAsc(String articleId, Pageable pageable);
    long countByArticleIdAndResolvedFalse(String articleId);
}
