package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/** KR-029 — Data access for article reactions; every query is workspace-scoped (RB-40 §1). */
public interface ArticleReactionRepository extends JpaRepository<ArticleReaction, String> {

    /** All reactions for an article within a given workspace (tenant-scoped). */
    List<ArticleReaction> findByArticleIdAndWorkspaceId(String articleId, String workspaceId);

    /** Lookup used for toggle — checks whether this exact (article, user, emoji) exists. */
    Optional<ArticleReaction> findByArticleIdAndUserIdAndEmoji(
            String articleId, String userId, String emoji);

    /** Delete used by the toggle when the reaction already exists (second click = unreact). */
    void deleteByArticleIdAndUserIdAndEmoji(
            String articleId, String userId, String emoji);
}
