package com.bcits.works.reporting;


import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** Pure due-logic of the subscription scheduler (no clock/DB) — RB-10 §7. */
@Tag("unit")
class BqlSubscriptionSchedulerTest {

    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-06-13T12:00:00Z");

    private static BqlSubscription sub(String freq, OffsetDateTime last) {
        BqlSubscription s = new BqlSubscription();
        s.setFrequency(freq);
        s.setLastRunAt(last);
        return s;
    }

    @Test
    void neverRun_isDue() {
        assertThat(BqlSubscriptionScheduler.isDue(sub("DAILY", null), NOW)).isTrue();
    }

    @Test
    void daily_dueAfter24h() {
        assertThat(BqlSubscriptionScheduler.isDue(sub("DAILY", NOW.minusHours(25)), NOW)).isTrue();
        assertThat(BqlSubscriptionScheduler.isDue(sub("DAILY", NOW.minusHours(23)), NOW)).isFalse();
    }

    @Test
    void weekly_dueAfter7Days() {
        assertThat(BqlSubscriptionScheduler.isDue(sub("WEEKLY", NOW.minusDays(8)), NOW)).isTrue();
        assertThat(BqlSubscriptionScheduler.isDue(sub("WEEKLY", NOW.minusDays(6)), NOW)).isFalse();
    }
}
