package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class CsatServiceTest {

    private final CsatService service = new CsatService();

    private CsatResponse rating(int r) {
        CsatResponse c = new CsatResponse();
        c.setRating(r);
        return c;
    }

    @Test
    void isValidRating_onlyOneToFive() {
        assertTrue(service.isValidRating(1));
        assertTrue(service.isValidRating(5));
        assertFalse(service.isValidRating(0));
        assertFalse(service.isValidRating(6));
        assertFalse(service.isValidRating(null));
    }

    @Test
    void prepareNew_setsIdAndTimestamp() {
        CsatResponse prepared = service.prepareNew(rating(5));
        assertTrue(prepared.getId().startsWith("CSAT-"));
        assertNotNull(prepared.getSubmittedAt());
    }

    @Test
    void summarize_emptyYieldsZeroedSummaryWithFullDistribution() {
        CsatService.CsatSummary s = service.summarize(List.of());
        assertEquals(0, s.count());
        assertEquals(0.0, s.average());
        assertEquals(0.0, s.percentSatisfied());
        assertEquals(5, s.distribution().size());
        assertEquals(0, s.distribution().get(3));
    }

    @Test
    void summarize_computesAverageDistributionAndSatisfaction() {
        // ratings: 5,4,4,2  -> avg 3.75, satisfied 3/4 = 75%
        CsatService.CsatSummary s = service.summarize(List.of(rating(5), rating(4), rating(4), rating(2)));
        assertEquals(4, s.count());
        assertEquals(3.75, s.average());
        assertEquals(75.0, s.percentSatisfied());
        assertEquals(2, s.distribution().get(4));
        assertEquals(1, s.distribution().get(5));
        assertEquals(1, s.distribution().get(2));
    }

    @Test
    void summarize_ignoresInvalidRatings() {
        CsatResponse bad = new CsatResponse();
        bad.setRating(9);
        CsatService.CsatSummary s = service.summarize(List.of(rating(5), bad));
        assertEquals(1, s.count());
        assertEquals(5.0, s.average());
    }
}
