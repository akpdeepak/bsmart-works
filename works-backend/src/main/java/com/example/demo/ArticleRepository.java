package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ArticleRepository extends JpaRepository<Article, String> {
    List<Article> findBySpaceIdOrderByUpdatedAtDesc(String spaceId);
    List<Article> findBySpaceIdAndStatusOrderByUpdatedAtDesc(String spaceId, String status);
    List<Article> findByTitleContainingIgnoreCaseOrderByUpdatedAtDesc(String query);
}
