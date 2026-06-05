package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Developer Workspace pure logic (Cap U, iteration 14): review-queue urgency ranking, completion
 * rate, the commit→status suggestion, and the standup render. These statics double as the
 * deterministic AI fallbacks (RB-40 §2), so testing them is testing the fallbacks. No DB.
 */
@Tag("unit")
class DeveloperWorkspaceServiceTest {

    @Test
    void urgencyScore_olderBiggerHigherPriority_ranksHigher() {
        int small = DeveloperWorkspaceService.prUrgencyScore(2, 50, "LOW", false);
        int old   = DeveloperWorkspaceService.prUrgencyScore(48, 50, "LOW", false);
        int p0    = DeveloperWorkspaceService.prUrgencyScore(2, 50, "P0", false);
        int big   = DeveloperWorkspaceService.prUrgencyScore(2, 800, "LOW", false);
        assertThat(old).isGreaterThan(small);
        assertThat(p0).isGreaterThan(old);
        assertThat(big).isGreaterThan(small);
    }

    @Test
    void urgencyScore_expertiseMatch_addsWeight() {
        int without = DeveloperWorkspaceService.prUrgencyScore(10, 100, "HIGH", false);
        int with    = DeveloperWorkspaceService.prUrgencyScore(10, 100, "HIGH", true);
        assertThat(with).isGreaterThan(without);
    }

    @Test
    void completionRate_guardsDivideByZero() {
        assertThat(DeveloperWorkspaceService.completionRate(0, 0)).isZero();
        assertThat(DeveloperWorkspaceService.completionRate(3, 4)).isEqualTo(75);
        assertThat(DeveloperWorkspaceService.completionRate(4, 4)).isEqualTo(100);
    }

    @Test
    void suggestFromCommit_parsesRefAndIntent() {
        Map<String, String> done = DeveloperWorkspaceService.suggestFromCommit("WRK-1247: fixes the CSRF bug");
        assertThat(done.get("workItemId")).isEqualTo("WRK-1247");
        assertThat(done.get("suggestedStatus")).isEqualTo("Done");

        Map<String, String> wip = DeveloperWorkspaceService.suggestFromCommit("WEB-5 wip refactor auth");
        assertThat(wip.get("workItemId")).isEqualTo("WEB-5");
        assertThat(wip.get("suggestedStatus")).isEqualTo("In Progress");

        Map<String, String> none = DeveloperWorkspaceService.suggestFromCommit("tidy up imports");
        assertThat(none.get("workItemId")).isNull();
        assertThat(none.get("suggestedStatus")).isNull();
    }

    @Test
    void renderStandup_hasAllThreeSections() {
        String s = DeveloperWorkspaceService.renderStandup(
            List.of("WRK-1: shipped"), List.of("WRK-2: in progress"), List.of("WRK-3 blocked by WRK-9"));
        assertThat(s).contains("Yesterday:").contains("Today:").contains("Blockers:");
        assertThat(s).contains("WRK-1: shipped").contains("WRK-2: in progress").contains("WRK-3 blocked by WRK-9");
    }

    @Test
    void renderStandup_emptyShowsPlaceholders() {
        String s = DeveloperWorkspaceService.renderStandup(List.of(), List.of(), List.of());
        assertThat(s).contains("(nothing recorded)").contains("(nothing in progress)").contains("None");
    }
}
