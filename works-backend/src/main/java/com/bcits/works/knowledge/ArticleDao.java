package com.bcits.works.knowledge;
import com.bcits.works.knowledge.api.Article;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Read/write DAO for the Knowledge-Base Article surface. Owns the {@link JdbcTemplate} SQL that
 * previously lived inline in {@link ArticleController}, so the controller keeps one job — HTTP,
 * RBAC, and assembly — while data access lives here (RB-10, one job per layer). Access is
 * workspace-scoped at the controller (RB-40 §1); the SQL is preserved verbatim from the controller.
 */
@Component
public class ArticleDao {

    private final JdbcTemplate jdbc;

    public ArticleDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Top search terms typed into the KB, most-searched first, capped to {@code limit}. */
    public List<Map<String, Object>> topSearchTerms(int limit) {
        return jdbc.queryForList(
            "SELECT term, search_count, last_searched_at FROM article_search_terms " +
            "ORDER BY search_count DESC, last_searched_at DESC LIMIT ?", Math.min(limit, 100));
    }

    /** Record a search term, incrementing its count on conflict. */
    public void recordSearchTerm(String term) {
        jdbc.update(
            "INSERT INTO article_search_terms (term, search_count, last_searched_at) VALUES (?, 1, NOW()) " +
            "ON CONFLICT (term) DO UPDATE SET search_count = article_search_terms.search_count + 1, last_searched_at = NOW()",
            term);
    }

    /** Increment the article's view counter. */
    public void incrementViewCount(String id) {
        jdbc.update("UPDATE articles SET view_count = view_count + 1 WHERE id = ?", id);
    }

    /** Work items linked to an article, most-recent link first. */
    public List<Map<String, Object>> articleLinks(String articleId) {
        return jdbc.queryForList(
            "SELECT l.work_item_id, l.link_type, w.title as work_item_title, w.type as work_item_type, w.status " +
            "FROM article_work_item_links l " +
            "LEFT JOIN work_items w ON w.id = l.work_item_id " +
            "WHERE l.article_id = ? ORDER BY l.created_at DESC", articleId);
    }

    /** Count of work items citing (linked to) the article. */
    public long countCitations(String articleId) {
        Long n = jdbc.queryForObject(
            "SELECT COUNT(*) FROM article_work_item_links WHERE article_id = ?", Long.class, articleId);
        return n == null ? 0 : n;
    }

    /** Increment the article's helpful-vote counter. */
    public void incrementHelpfulVotes(String id) {
        jdbc.update("UPDATE articles SET helpful_votes = helpful_votes + 1 WHERE id = ?", id);
    }

    /** Link a work item to the article (no-op on conflict). */
    public void linkWorkItem(String articleId, String workItemId, String linkType, String userId) {
        jdbc.update("INSERT INTO article_work_item_links (article_id, work_item_id, link_type, created_by, created_at) " +
                    "VALUES (?, ?, ?, ?, NOW()) ON CONFLICT (article_id, work_item_id) DO NOTHING",
                    articleId, workItemId, linkType, userId);
    }

    /** Remove a work-item link from the article. */
    public void unlinkWorkItem(String articleId, String workItemId) {
        jdbc.update("DELETE FROM article_work_item_links WHERE article_id = ? AND work_item_id = ?",
            articleId, workItemId);
    }
}
