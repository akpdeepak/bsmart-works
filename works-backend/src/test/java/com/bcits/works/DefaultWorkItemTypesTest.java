package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pins the 7 MVP built-in WorkItem types (I01-S06, Cap B) and enforces on-brand colours — the
 * single source of truth shared with the frontend (RB-30 unification, Part-6 palette).
 */
@Tag("unit")
class DefaultWorkItemTypesTest {

    // The constitution's Part-6 brand/semantic/neutral hexes (the only colours a default may use).
    private static final Set<String> BRAND_PALETTE = Set.of(
        "#0B2F5C", "#1E4D8C", "#E94E1B", "#0E7C5E", "#B97A00", "#C0392B", "#475569", "#334155");

    @Test
    void shipsExactlyTheSevenSpecTypes() {
        Set<String> keys = DefaultWorkItemTypes.ALL.stream()
                .map(t -> (String) t.get("typeKey")).collect(Collectors.toSet());
        assertThat(keys).containsExactlyInAnyOrder(
                "EPIC", "STORY", "TASK", "BUG", "SUBTASK", "INCIDENT", "SERVICE_REQUEST");
        assertThat(DefaultWorkItemTypes.ALL).hasSize(7);
    }

    @Test
    void everyDefaultHasLabelIconAndOnBrandColour_andIsNotCustom() {
        for (var type : DefaultWorkItemTypes.ALL) {
            assertThat((String) type.get("label")).isNotBlank();
            assertThat((String) type.get("icon")).isNotBlank();
            assertThat((String) type.get("color")).isIn(BRAND_PALETTE); // on-brand, not raw Tailwind hex
            assertThat(type.get("isCustom")).isEqualTo(false);
        }
    }

    @Test
    void typeKeysAreUnique() {
        List<String> keys = DefaultWorkItemTypes.ALL.stream()
                .map(t -> (String) t.get("typeKey")).collect(Collectors.toList());
        assertThat(keys).doesNotHaveDuplicates();
    }
}
