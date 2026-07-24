package com.bcits.works;

import com.bcits.works.shared.DbRateLimitStore;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the distributed rate-limit store (W1 PR3) enforces a single budget <b>across instances</b> —
 * the property the in-memory limiter lacks. Two separate {@link DbRateLimitStore} objects (each a
 * stand-in for a horizontally-scaled app instance) share the one {@code rate_limit_windows} table
 * (V118), so attempts on one count against the other. Real Postgres via Testcontainers (RB-10 §7).
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
@Transactional
class DistributedRateLimitIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired JdbcTemplate jdbc;

    @Test
    void budgetIsSharedAcrossInstances() {
        DbRateLimitStore instanceA = new DbRateLimitStore(jdbc);
        DbRateLimitStore instanceB = new DbRateLimitStore(jdbc);
        String key = "drl-test:shared";
        long window = 60_000L;
        int max = 3;

        // Three allowed attempts spread across the two instances — B sees A's counts via the shared table.
        assertThat(instanceA.allow(key, max, window)).as("attempt 1 (A)").isTrue();
        assertThat(instanceB.allow(key, max, window)).as("attempt 2 (B)").isTrue();
        assertThat(instanceA.allow(key, max, window)).as("attempt 3 (A)").isTrue();
        // The 4th+ attempt is over the SHARED budget regardless of which instance serves it.
        assertThat(instanceB.allow(key, max, window)).as("attempt 4 (B) over shared budget").isFalse();
        assertThat(instanceA.allow(key, max, window)).as("attempt 5 (A) over shared budget").isFalse();
    }

    @Test
    void windowRollsOver_givesFreshBudget() {
        DbRateLimitStore store = new DbRateLimitStore(jdbc);
        String key = "drl-test:rollover";
        // A zero-length window means every attempt starts a fresh window → never exceeds a budget of 1.
        assertThat(store.allow(key, 1, 0L)).isTrue();
        assertThat(store.allow(key, 1, 0L)).isTrue();
    }

    @Test
    void reset_clearsTheSharedWindow() {
        DbRateLimitStore store = new DbRateLimitStore(jdbc);
        String key = "drl-test:reset";
        assertThat(store.allow(key, 1, 60_000L)).isTrue();
        assertThat(store.allow(key, 1, 60_000L)).as("second attempt over budget").isFalse();
        store.reset(key);
        assertThat(store.allow(key, 1, 60_000L)).as("fresh budget after reset").isTrue();
    }
}
