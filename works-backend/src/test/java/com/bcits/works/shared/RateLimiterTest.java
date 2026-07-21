package com.bcits.works.shared;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class RateLimiterTest {

    private final RateLimiter limiter = new RateLimiter();

    @Test
    void allowsUpToTheLimitThenBlocks() {
        long window = 60_000L;
        for (int i = 1; i <= 3; i++) {
            assertThat(limiter.allow("k", 3, window, 1_000L)).as("attempt %d", i).isTrue();
        }
        // 4th attempt within the same window is rejected
        assertThat(limiter.allow("k", 3, window, 1_500L)).isFalse();
    }

    @Test
    void windowRollsOverAndResetsTheCount() {
        assertThat(limiter.allow("k", 1, 1_000L, 0L)).isTrue();
        assertThat(limiter.allow("k", 1, 1_000L, 500L)).isFalse();   // still in window
        assertThat(limiter.allow("k", 1, 1_000L, 1_000L)).isTrue();  // window elapsed → fresh budget
    }

    @Test
    void keysAreIndependent() {
        assertThat(limiter.allow("a", 1, 1_000L, 0L)).isTrue();
        assertThat(limiter.allow("b", 1, 1_000L, 0L)).isTrue();
        assertThat(limiter.allow("a", 1, 1_000L, 100L)).isFalse();
    }

    @Test
    void countingContinuesPastLimitSoSpammingCannotResetTheWindow() {
        assertThat(limiter.allow("k", 1, 1_000L, 0L)).isTrue();
        assertThat(limiter.allow("k", 1, 1_000L, 100L)).isFalse();
        assertThat(limiter.allow("k", 1, 1_000L, 200L)).isFalse();
    }

    @Test
    void resetClearsTheKey() {
        assertThat(limiter.allow("k", 1, 1_000L, 0L)).isTrue();
        assertThat(limiter.allow("k", 1, 1_000L, 100L)).isFalse();
        limiter.reset("k");
        assertThat(limiter.allow("k", 1, 1_000L, 200L)).isTrue();
    }
}
