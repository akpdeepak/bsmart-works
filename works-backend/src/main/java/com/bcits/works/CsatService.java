package com.bcits.works;

import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Pure logic for CSAT (iteration 9, Cap N): rating validation, stamping a new response, and
 * aggregating a set of responses into a trend summary. No I/O — unit-testable in isolation.
 */
@Service
public class CsatService {

    /** Aggregated CSAT for reporting: count, average score, 1..5 distribution and % satisfied. */
    public record CsatSummary(int count, double average, Map<Integer, Integer> distribution, double percentSatisfied) { }

    /** A rating is valid only in the inclusive range 1..5. */
    public boolean isValidRating(Integer rating) {
        return rating != null && rating >= 1 && rating <= 5;
    }

    /** Stamp a new CSAT response with id and timestamp. Caller validates the rating first. */
    public CsatResponse prepareNew(CsatResponse response) {
        response.setId("CSAT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        response.setSubmittedAt(OffsetDateTime.now());
        return response;
    }

    /**
     * Aggregate responses into a trend summary. "Satisfied" is a rating of 4 or 5. An empty list
     * yields a zeroed summary with a full 1..5 distribution so charts always render.
     */
    public CsatSummary summarize(List<CsatResponse> responses) {
        Map<Integer, Integer> distribution = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0);
        }
        if (responses == null || responses.isEmpty()) {
            return new CsatSummary(0, 0.0, distribution, 0.0);
        }
        int total = 0;
        int satisfied = 0;
        int counted = 0;
        for (CsatResponse r : responses) {
            if (!isValidRating(r.getRating())) {
                continue;
            }
            int rating = r.getRating();
            distribution.put(rating, distribution.get(rating) + 1);
            total += rating;
            if (rating >= 4) {
                satisfied++;
            }
            counted++;
        }
        if (counted == 0) {
            return new CsatSummary(0, 0.0, distribution, 0.0);
        }
        double average = Math.round((double) total / counted * 100.0) / 100.0;
        double percentSatisfied = Math.round((double) satisfied / counted * 1000.0) / 10.0;
        return new CsatSummary(counted, average, distribution, percentSatisfied);
    }
}
