package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class ArticleAnalyticsServiceTest {

    private final ArticleAnalyticsService service = new ArticleAnalyticsService();

    @Test
    void daysSince_countsWholeDays() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        assertThat(service.daysSince(now.minusDays(5), now)).isEqualTo(5);
    }

    @Test
    void daysSince_nullInput_isZero() {
        assertThat(service.daysSince(null, OffsetDateTime.now())).isZero();
    }

    @Test
    void daysSince_futureDate_neverNegative() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        assertThat(service.daysSince(now.plusDays(3), now)).isZero();
    }

    @Test
    void publishedAndOld_isStale() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        assertThat(service.isStale("PUBLISHED", now.minusDays(120), now, 90)).isTrue();
    }

    @Test
    void publishedAndRecent_isNotStale() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        assertThat(service.isStale("PUBLISHED", now.minusDays(10), now, 90)).isFalse();
    }

    @Test
    void draft_isNeverStale_evenIfOld() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        assertThat(service.isStale("DRAFT", now.minusDays(999), now, 90)).isFalse();
    }

    @Test
    void archived_isNeverStale() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-01T00:00:00Z");
        assertThat(service.isStale("ARCHIVED", now.minusDays(999), now, 90)).isFalse();
    }

    @Test
    void normalizeSearchTerm_trimsCollapsesAndLowercases() {
        assertThat(service.normalizeSearchTerm("  Meter   Reset ")).isEqualTo("meter reset");
    }

    @Test
    void normalizeSearchTerm_blankOrNull_isNull() {
        assertThat(service.normalizeSearchTerm("   ")).isNull();
        assertThat(service.normalizeSearchTerm(null)).isNull();
    }
}
