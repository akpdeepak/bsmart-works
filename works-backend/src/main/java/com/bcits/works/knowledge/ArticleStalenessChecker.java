package com.bcits.works.knowledge;
import com.bcits.works.WorksApplication;
import com.bcits.works.workspaces.api.Workspace;
import com.bcits.works.knowledge.api.Article;
import com.bcits.works.knowledge.api.ArticleRepository;
import com.bcits.works.knowledge.api.KnowledgeSpace;
import com.bcits.works.knowledge.api.KnowledgeSpaceRepository;

import com.bcits.works.shared.EventService;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * KR-021 — Stale article checker.
 * Runs at 1 am daily and flags articles whose review_by_date has passed as stale.
 * The is_stale flag surfaces on article cards and drives workspace-level staleness reports.
 *
 * Workspace isolation (RB-40 §1): every event carries workspaceId resolved from the
 * article's knowledge_space.
 *
 * @EnableScheduling is on WorksApplication.
 */
@Component
public class ArticleStalenessChecker {

    private final ArticleRepository articleRepository;
    private final KnowledgeSpaceRepository knowledgeSpaceRepository;
    private final EventService eventService;

    public ArticleStalenessChecker(ArticleRepository articleRepository,
                                   KnowledgeSpaceRepository knowledgeSpaceRepository,
                                   EventService eventService) {
        this.articleRepository = articleRepository;
        this.knowledgeSpaceRepository = knowledgeSpaceRepository;
        this.eventService = eventService;
    }

    @Scheduled(cron = "0 0 1 * * *") // 1am daily
    public void markStale() {
        List<Article> stale = articleRepository.findPublishedWithPassedReviewByDate();
        OffsetDateTime now = OffsetDateTime.now();
        for (Article article : stale) {
            article.setIsStale(true);
            article.setUpdatedAt(now);
            articleRepository.save(article);

            String workspaceId = knowledgeSpaceRepository.findById(article.getSpaceId())
                    .map(KnowledgeSpace::getWorkspaceId)
                    .orElse(null);
            if (workspaceId != null) {
                eventService.recordInWorkspace(workspaceId, article.getId(),
                        "ARTICLE_STALE", "system",
                        Map.of("reviewByDate", article.getReviewByDate().toString()));
            } else {
                eventService.record(article.getId(), "ARTICLE_STALE", "system",
                        "{\"reviewByDate\":\"" + article.getReviewByDate() + "\"}");
            }
        }
    }
}
