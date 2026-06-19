package com.bcits.works;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * KR-020 — Scheduled publish job.
 * Runs every 60 seconds and publishes articles whose scheduled_publish_at time has passed.
 *
 * Workspace isolation (RB-40 §1): every published article emits an event that carries
 * workspaceId, resolved via the article's knowledge_space.
 *
 * @EnableScheduling is already on WorksApplication.
 */
@Component
public class ArticleScheduledPublisher {

    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final EventService eventService;
    private final WebhookService webhookService;

    public ArticleScheduledPublisher(ArticleRepository articleRepository,
                                     KnowledgeSpaceRepository knowledgeSpaceRepository,
                                     EventService eventService,
                                     WebhookService webhookService) {
        this.articleRepository = articleRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.eventService = eventService;
        this.webhookService = webhookService;
    }

    @Scheduled(fixedDelay = 60_000)
    public void publishDue() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Article> due = articleRepository.findByStatusAndScheduledPublishAtBefore("SCHEDULED", now);
        for (Article article : due) {
            article.setStatus("PUBLISHED");
            article.setPublishedAt(now);
            article.setUpdatedAt(now);
            articleRepository.save(article);

            // Emit workspace-scoped event (RB-40 §1)
            String workspaceId = knowledgeSpaceRepository.findById(article.getSpaceId())
                    .map(KnowledgeSpace::getWorkspaceId)
                    .orElse(null);
            if (workspaceId != null) {
                eventService.recordInWorkspace(workspaceId, article.getId(),
                        "ARTICLE_PUBLISHED", "system",
                        Map.of("trigger", "scheduled", "scheduledAt",
                                article.getScheduledPublishAt().toString()));
                webhookService.enqueue(workspaceId, "ARTICLE_PUBLISHED",
                        Map.of("articleId", article.getId(), "trigger", "scheduled",
                                "scheduledAt", article.getScheduledPublishAt().toString()));
            } else {
                eventService.record(article.getId(), "ARTICLE_PUBLISHED", "system",
                        "{\"trigger\":\"scheduled\"}");
            }
        }
    }
}
