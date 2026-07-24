package com.bcits.works.shared;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@Tag("unit")
class CommandSearchServiceTest {

    @Test
    void safeLikeEscapesWildcards() {
        assertEquals("100\\% done", CommandSearchService.safeLike("100% done"));
        assertEquals("a\\_b", CommandSearchService.safeLike("a_b"));
        assertEquals("", CommandSearchService.safeLike(null));
    }

    @Test
    void safeLikeTrims() {
        assertFalse(CommandSearchService.safeLike("  hi  ").startsWith(" "));
        assertEquals("hi", CommandSearchService.safeLike("  hi  "));
    }
}
