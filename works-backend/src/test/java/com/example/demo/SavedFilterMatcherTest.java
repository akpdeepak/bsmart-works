package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class SavedFilterMatcherTest {

    private final SavedFilterMatcher matcher = new SavedFilterMatcher();

    @Test
    void mine_matchesWhenAssignedToTheFilterOwner() {
        assertThat(matcher.matches("{\"type\":\"mine\"}", "USR-1", "HIGH", "Bug", "USR-1")).isTrue();
        assertThat(matcher.matches("{\"type\":\"mine\"}", "USR-1", "HIGH", "Bug", "USR-2")).isFalse();
    }

    @Test
    void priority_matchesOnValue() {
        assertThat(matcher.matches("{\"type\":\"priority\",\"value\":\"HIGH\"}", "USR-1", "HIGH", "Bug", "USR-2")).isTrue();
        assertThat(matcher.matches("{\"type\":\"priority\",\"value\":\"HIGH\"}", "USR-1", "LOW", "Bug", "USR-2")).isFalse();
    }

    @Test
    void itemType_matchesOnValue() {
        assertThat(matcher.matches("{\"type\":\"itemType\",\"value\":\"Story\"}", "USR-1", "HIGH", "Story", "USR-2")).isTrue();
        assertThat(matcher.matches("{\"type\":\"itemType\",\"value\":\"Story\"}", "USR-1", "HIGH", "Bug", "USR-2")).isFalse();
    }

    @Test
    void blockers_matchCriticalOrIncident() {
        assertThat(matcher.matches("{\"type\":\"blockers\"}", "USR-1", "CRITICAL", "Bug", "USR-2")).isTrue();
        assertThat(matcher.matches("{\"type\":\"blockers\"}", "USR-1", "LOW", "Incident", "USR-2")).isTrue();
        assertThat(matcher.matches("{\"type\":\"blockers\"}", "USR-1", "LOW", "Bug", "USR-2")).isFalse();
    }

    @Test
    void invalidBlankOrUnknown_doesNotMatch() {
        assertThat(matcher.matches(null, "USR-1", "HIGH", "Bug", "USR-1")).isFalse();
        assertThat(matcher.matches("", "USR-1", "HIGH", "Bug", "USR-1")).isFalse();
        assertThat(matcher.matches("not json", "USR-1", "HIGH", "Bug", "USR-1")).isFalse();
        assertThat(matcher.matches("{\"type\":\"unknown\"}", "USR-1", "HIGH", "Bug", "USR-1")).isFalse();
    }
}
