package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Iteration 16 — pure-logic tests for the executive-briefing and slide-deck fallbacks (Cap X).
 *
 * <p>Split out of {@code Iteration16LeadershipTest} (GH-537). {@code LeadershipService} carved into
 * {@code reporting}, but {@code Iteration16AiService} had to stay at the flat root: it reaches
 * {@code ai.AiAssistService.AiMeta}, an internal nested DTO, so moving it into {@code reporting}
 * broke the cross-module api boundary. Publishing {@code AiMeta} properly is a follow-up; until
 * then this test lives beside the class it exercises.
 */
@Tag("unit")
class Iteration16BriefingTest {

    @Test
    void renderBriefing_includesDeliveryAndRiskHeadlines() {
        Map<String, Object> rollup = Map.of("totals",
            Map.of("total", 40, "in_progress", 6, "overdue", 2, "unassigned", 1), "completionRate", 55);
        Map<String, Object> customers = Map.of("customers", List.of(), "atRiskCount", 0);
        Map<String, Object> risks = Map.of("risks", List.of(Map.of("score", 9, "title", "Vendor SLA gap")));
        String md = Iteration16AiService.renderBriefing("Delivery", rollup, customers, risks);
        assertThat(md).contains("40 work items", "55%", "Vendor SLA gap", "Focus: Delivery");
    }

    @Test
    void buildSlides_alwaysProducesOverviewAndRiskSlides() {
        Map<String, Object> rollup = Map.of("totals", Map.of("total", 10, "in_progress", 2, "overdue", 0), "completionRate", 80);
        List<Map<String, Object>> slides = Iteration16AiService.buildSlides("Q3",
            rollup, Map.of("themes", List.of()), Map.of("risks", List.of()));
        assertThat(slides).hasSize(4);
        assertThat(slides.get(0).get("title").toString()).contains("Q3");
        assertThat(Iteration16AiService.renderSlides(slides)).contains("Slide 1", "Top risks");
    }

}
