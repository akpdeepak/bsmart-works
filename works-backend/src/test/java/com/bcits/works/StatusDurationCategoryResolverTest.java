package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Pins {@link StatusDurationController#categoryResolver}'s status-name → category contract.
 *
 * <p>The V87 backfill migration synthesizes status history using the literal status names
 * {@code 'Todo' | 'In Progress' | 'Done'} (the values the seed data uses). Those names are NOT in
 * most per-type workflow templates (a RISK's statuses are Identified/Mitigating/Closed, etc.), so
 * the config-first lookup misses and correctness falls through to the name heuristic. If anyone
 * changes that heuristic, the backfilled Activity feed + flow-metrics surfaces would silently
 * mis-categorise and skew lead/cycle time — this test fails first.
 */
@Tag("unit")
class StatusDurationCategoryResolverTest {

    // Empty config map → forces the heuristic path, which is exactly V87's real-world situation.
    private final Function<String, String> heuristic = StatusDurationController.categoryResolver(Map.of());

    @Test
    void v87SeedStatusNamesResolveToTheExpectedCategories() {
        assertEquals("TODO", heuristic.apply("Todo"));
        assertEquals("IN_PROGRESS", heuristic.apply("In Progress"));
        assertEquals("DONE", heuristic.apply("Done"));
    }

    @Test
    void resolutionIsCaseInsensitive() {
        assertEquals("IN_PROGRESS", heuristic.apply("in progress"));
        assertEquals("DONE", heuristic.apply("DONE"));
    }

    @Test
    void configuredCategoryWinsOverTheHeuristic() {
        // A workspace that maps a custom name takes precedence over any heuristic guess.
        Function<String, String> withConfig =
            StatusDurationController.categoryResolver(Map.of("backlog", "TODO", "shipping", "DONE"));
        assertEquals("DONE", withConfig.apply("Shipping"));   // config-first, case-insensitive
        assertEquals("TODO", withConfig.apply("Backlog"));
        // names not in the config still fall through to the heuristic
        assertEquals("IN_PROGRESS", withConfig.apply("In Progress"));
    }

    @Test
    void unknownNamesAndNullDefaultToTodo() {
        assertEquals("TODO", heuristic.apply("Something Else"));
        assertEquals("TODO", heuristic.apply(null));
    }
}
