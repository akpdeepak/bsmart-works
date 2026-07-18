package com.bcits.works.messaging;

import com.bcits.works.knowledge.KnowledgeWorkspaceSettings;
import com.bcits.works.shared.EventService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * KR-030 — Comment Digest Scheduler.
 *
 * <p>Runs at 08:00 daily. For every workspace with {@code knowledge.commentDigestFrequency = "daily"},
 * it finds comments created in the last 24 hours, groups them by article, and emits one
 * {@code COMMENT_DIGEST} event per article author so the notification layer (or a downstream email
 * integration) can deliver the digest.
 *
 * <p>All queries are workspace-scoped via {@code workspace_id} and the {@code knowledge_spaces}
 * join (RB-40 §1). The {@link #digest()} method is package-visible for unit testing without
 * touching the clock.
 */
@Component
public class CommentDigestScheduler {

    private static final Logger log = LoggerFactory.getLogger(CommentDigestScheduler.class);

    private final JdbcTemplate jdbc;
    private final KnowledgeWorkspaceSettings knowledgeSettings;
    private final EventService eventService;

    public CommentDigestScheduler(JdbcTemplate jdbc,
                                   KnowledgeWorkspaceSettings knowledgeSettings,
                                   EventService eventService) {
        this.jdbc = jdbc;
        this.knowledgeSettings = knowledgeSettings;
        this.eventService = eventService;
    }

    @Scheduled(cron = "0 0 8 * * *")
    public void scheduledDigest() {
        log.info("[COMMENT-DIGEST] Starting scheduled daily comment digest");
        digest();
    }

    /**
     * Public for testing — emits {@code COMMENT_DIGEST} events for all workspaces
     * with daily digest enabled.
     */
    public void digest() {
        OffsetDateTime since = OffsetDateTime.now().minusHours(24);
        List<String> workspaces = knowledgeSettings.getWorkspacesWithFrequency("daily");

        for (String workspaceId : workspaces) {
            try {
                processWorkspace(workspaceId, since);
            } catch (Exception e) {
                log.warn("[COMMENT-DIGEST] Failed for workspace {}: {}", workspaceId, e.getMessage());
            }
        }
        log.info("[COMMENT-DIGEST] Done. Processed {} workspace(s)", workspaces.size());
    }

    private void processWorkspace(String workspaceId, OffsetDateTime since) {
        // Workspace-scoped via both abc.workspace_id and the knowledge_spaces join (RB-40 §1).
        List<Map<String, Object>> commentCounts = jdbc.queryForList(
            "SELECT abc.article_id, a.title, a.author_id, COUNT(abc.id) AS new_comment_count "
            + "FROM article_block_comments abc "
            + "INNER JOIN articles a ON a.id = abc.article_id "
            + "INNER JOIN knowledge_spaces ks ON ks.id = a.space_id "
            + "WHERE abc.workspace_id = ? AND abc.created_at >= ? AND ks.workspace_id = ? "
            + "GROUP BY abc.article_id, a.title, a.author_id",
            workspaceId, since, workspaceId);

        if (commentCounts.isEmpty()) return;

        // Build article summaries and collect recipients.
        List<Map<String, Object>> articles = new ArrayList<>();
        Set<String> recipientIds = new LinkedHashSet<>();

        for (Map<String, Object> row : commentCounts) {
            String articleId = (String) row.get("article_id");
            String title     = (String) row.get("title");
            String authorId  = (String) row.get("author_id");
            long count = ((Number) row.get("new_comment_count")).longValue();

            articles.add(Map.of(
                "id",              articleId != null ? articleId : "",
                "title",           title     != null ? title     : "",
                "newCommentCount", count));

            if (authorId != null && !authorId.isBlank()) {
                recipientIds.add(authorId);
            }
        }

        // One COMMENT_DIGEST event per recipient (article author).
        for (String recipientId : recipientIds) {
            eventService.recordInWorkspace(
                workspaceId, workspaceId, "COMMENT_DIGEST", "system",
                Map.of(
                    "recipientId", recipientId,
                    "workspaceId", workspaceId,
                    "articles",    articles));
        }

        log.info("[COMMENT-DIGEST] Workspace {}: {} article(s), {} recipient(s)",
                workspaceId, articles.size(), recipientIds.size());
    }
}
