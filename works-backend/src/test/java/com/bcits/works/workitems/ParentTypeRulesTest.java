package com.bcits.works.workitems;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Parent/child hierarchy rules (roadmap: "custom work-type parent rules are unenforced").
 *
 * <p>Before this class the only hierarchy source was the static {@code DefaultWorkItemTypes}
 * map, so a workspace could define a custom type with {@code valid_parent_types} and the API
 * ignored it — every parent was rejected. These tests pin the resolution order: a non-empty
 * workspace configuration wins, and the built-in hierarchy applies otherwise.
 */
@Tag("unit")
class ParentTypeRulesTest {

    @Test
    void builtInHierarchyIsTheInverseOfTheDefaultChildMap() {
        assertThat(ParentTypeRules.builtInParents("TASK"))
            .containsExactlyInAnyOrder("EPIC", "STORY", "BUG", "INCIDENT",
                                       "HR_SERVICE_REQUEST", "IT_SERVICE_REQUEST");
        assertThat(ParentTypeRules.builtInParents("EPIC"))
            .containsExactlyInAnyOrder("INITIATIVE", "THEME");
        assertThat(ParentTypeRules.builtInParents("CAPABILITY")).isEmpty();
    }

    @Test
    void builtInHierarchyGovernsWhenNothingIsConfigured() {
        assertThat(ParentTypeRules.permits("EPIC", "STORY", null)).isTrue();
        assertThat(ParentTypeRules.permits("EPIC", "STORY", List.of())).isTrue();
        assertThat(ParentTypeRules.permits("TASK", "EPIC", List.of())).isFalse();
    }

    /** The gap this closes: a custom child type had no built-in parents, so nothing was allowed. */
    @Test
    void configuredParentsGovernACustomChildType() {
        assertThat(ParentTypeRules.permits("EPIC", "SPIKE", null)).isFalse();
        assertThat(ParentTypeRules.permits("EPIC", "SPIKE", List.of("EPIC"))).isTrue();
        assertThat(ParentTypeRules.permits("STORY", "SPIKE", List.of("EPIC"))).isFalse();
    }

    /** A custom parent type is equally unreachable under the built-in map alone. */
    @Test
    void configuredParentsAllowACustomParentType() {
        assertThat(ParentTypeRules.permits("DISCOVERY", "TASK", null)).isFalse();
        assertThat(ParentTypeRules.permits("DISCOVERY", "TASK", List.of("DISCOVERY"))).isTrue();
    }

    /** Configuration replaces the built-in list rather than widening it. */
    @Test
    void configurationNarrowsAsWellAsWidens() {
        assertThat(ParentTypeRules.permits("BUG", "TASK", null)).isTrue();
        assertThat(ParentTypeRules.permits("BUG", "TASK", List.of("EPIC"))).isFalse();
        assertThat(ParentTypeRules.allowedParents("TASK", List.of("EPIC")))
            .containsExactly("EPIC");
    }

    /**
     * {@code valid_parent_types} is {@code NOT NULL DEFAULT '[]'} (V68), so every pre-existing
     * custom-type row carries an empty array. Treating that as "no parent is legal" would break
     * hierarchies that work today, so empty means "not configured".
     */
    @Test
    void emptyConfigurationMeansNotConfigured() {
        assertThat(ParentTypeRules.allowedParents("TASK", List.of()))
            .isEqualTo(ParentTypeRules.builtInParents("TASK"));
    }

    @Test
    void typeKeysAreComparedCaseInsensitivelyAndTrimmed() {
        assertThat(ParentTypeRules.permits("epic", "story", null)).isTrue();
        assertThat(ParentTypeRules.permits("EPIC", "SPIKE", List.of(" epic "))).isTrue();
    }

    @Test
    void nullAndBlankTypesArePermittedByNothing() {
        assertThat(ParentTypeRules.permits(null, "TASK", null)).isFalse();
        assertThat(ParentTypeRules.permits("EPIC", null, null)).isFalse();
        assertThat(ParentTypeRules.permits("EPIC", "  ", null)).isFalse();
        assertThat(ParentTypeRules.allowedParents(null, null)).isEqualTo(Set.of());
    }

    /** Blank entries in a stored array must not become a wildcard-ish empty match. */
    @Test
    void blankConfiguredEntriesAreIgnored() {
        assertThat(ParentTypeRules.allowedParents("SPIKE", List.of(" ", "")))
            .isEqualTo(ParentTypeRules.builtInParents("SPIKE"));
    }
}
