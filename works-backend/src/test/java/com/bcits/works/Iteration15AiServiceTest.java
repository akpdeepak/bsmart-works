package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class Iteration15AiServiceTest {

    @Test
    void suggestCommit_fillsUpToCapacityInOrder() {
        List<Map<String, Object>> ready = List.of(
            item("A", 5), item("B", 8), item("C", 3), item("D", 13));
        List<Map<String, Object>> commit = Iteration15AiService.suggestCommit(ready, 16);
        // 5 + 8 + 3 = 16 fits; 13 would overflow and is skipped.
        assertThat(commit).extracting(m -> m.get("id")).containsExactly("A", "B", "C");
    }

    @Test
    void planningCapacity_subtractsTimeOffAndFloorsAtZero() {
        assertThat(Iteration15AiService.planningCapacity(30, 8)).isEqualTo(22);
        assertThat(Iteration15AiService.planningCapacity(5, 20)).isZero();
        assertThat(Iteration15AiService.planningCapacity(30, null)).isEqualTo(30);
    }

    @Test
    void refinementScore_rewardsValueAndFitPenalizesEffort() {
        int highValueLinked = Iteration15AiService.refinementScore(
            Map.of("priority", "Highest", "parent_id", "EPIC-1", "story_points", 3));
        int lowValueOrphan = Iteration15AiService.refinementScore(
            Map.of("priority", "Low", "story_points", 13));
        assertThat(highValueLinked).isGreaterThan(lowValueOrphan);
        // 40 (Highest) + 20 (parent) - 3 (effort) = 57
        assertThat(highValueLinked).isEqualTo(57);
    }

    @Test
    void renderReleaseNotes_groupsByTypeHeading() {
        Map<String, List<String>> byType = new TreeMap<>();
        byType.put("Bug", List.of("Fix login loop"));
        byType.put("Story", List.of("Add roadmap view"));
        String md = Iteration15AiService.renderReleaseNotes("Portal v4.2.0", byType);
        assertThat(md).contains("# Portal v4.2.0");
        assertThat(md).contains("## Fixes").contains("- Fix login loop");
        assertThat(md).contains("## Features").contains("- Add roadmap view");
    }

    @Test
    void renderReleaseNotes_handlesEmpty() {
        assertThat(Iteration15AiService.renderReleaseNotes("R", new TreeMap<>()))
            .contains("_No completed items yet._");
    }

    @Test
    void isStale_flagsOldActivityAndNulls() {
        assertThat(Iteration15AiService.isStale(null, 3)).isTrue();
        assertThat(Iteration15AiService.isStale(OffsetDateTime.now().minusDays(5), 3)).isTrue();
        assertThat(Iteration15AiService.isStale(OffsetDateTime.now().minusHours(2), 3)).isFalse();
    }

    @Test
    void themeForFeedback_mapsGeneralToOther() {
        assertThat(Iteration15AiService.themeForFeedback("the login page is broken")).isEqualTo("Auth");
        assertThat(Iteration15AiService.themeForFeedback("random musing")).isEqualTo("Other");
    }

    private static Map<String, Object> item(String id, int points) {
        return Map.of("id", id, "story_points", points);
    }
}
