package com.example.demo;

import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.OffsetDateTime;

/**
 * Pure helpers for article analytics — view/vote counts come straight from the
 * row, but staleness is a derived signal so it lives here where it is unit-testable.
 */
@Service
public class ArticleAnalyticsService {

    /** A published article untouched for this many days is considered stale. */
    public static final int STALE_THRESHOLD_DAYS = 90;

    /** Whole days elapsed between {@code from} and {@code now} (never negative). */
    public long daysSince(OffsetDateTime from, OffsetDateTime now) {
        if (from == null || now == null) return 0;
        long days = Duration.between(from, now).toDays();
        return Math.max(days, 0);
    }

    /**
     * Stale = PUBLISHED and not updated within {@code thresholdDays}. Drafts,
     * in-review, and archived articles are never flagged stale.
     */
    public boolean isStale(String status, OffsetDateTime updatedAt, OffsetDateTime now, int thresholdDays) {
        if (!ArticleWorkflowService.PUBLISHED.equals(status)) return false;
        return daysSince(updatedAt, now) > thresholdDays;
    }
}
