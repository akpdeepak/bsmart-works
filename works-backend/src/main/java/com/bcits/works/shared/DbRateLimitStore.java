package com.bcits.works.shared;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Distributed (DB-backed) fixed-window rate-limit store (RB-10 §8; W1 rate-limit PR3). The in-memory
 * {@link RateLimiter} counts per JVM, so with N horizontally-scaled instances an attacker effectively
 * gets N x the budget; this store shares the window across all instances via the {@code
 * rate_limit_windows} table (V118). Selected by {@code app.rate-limit.distributed} (default off);
 * Redis is the deferred AWS-infra follow-up — this is the no-new-dependency interim.
 *
 * <p><b>Atomicity:</b> a single {@code INSERT … ON CONFLICT DO UPDATE … RETURNING count} both rolls
 * the window over and increments the count under the row lock, so concurrent instances cannot race the
 * read-modify-write. The window math uses the <b>DB clock</b> ({@code now()}), not per-instance wall
 * time, so there is no cross-instance clock skew. The attempt is counted whether or not it is allowed,
 * matching the in-memory limiter (a caller cannot reset the window by spamming past the limit).
 */
@Component
public class DbRateLimitStore {

    private static final Logger log = LoggerFactory.getLogger(DbRateLimitStore.class);

    private final JdbcTemplate jdbc;

    public DbRateLimitStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** True if the attempt is within budget. Fail-OPEN on a DB error (a store outage must not lock all auth out). */
    public boolean allow(String key, int maxAttempts, long windowMillis) {
        try {
            Integer count = jdbc.queryForObject(
                "INSERT INTO rate_limit_windows (rl_key, window_start, count) VALUES (?, now(), 1) "
                + "ON CONFLICT (rl_key) DO UPDATE SET "
                + "  count = CASE WHEN now() - rate_limit_windows.window_start >= (? * interval '1 millisecond') "
                + "               THEN 1 ELSE rate_limit_windows.count + 1 END, "
                + "  window_start = CASE WHEN now() - rate_limit_windows.window_start >= (? * interval '1 millisecond') "
                + "                      THEN now() ELSE rate_limit_windows.window_start END "
                + "RETURNING count",
                Integer.class, key, windowMillis, windowMillis);
            return count == null || count <= maxAttempts;
        } catch (Exception e) {
            // Fail OPEN: a shared-store outage must not deny all auth. Surfaced at WARN, never silent.
            log.warn("Distributed rate-limit check failed for key={}; allowing (fail-open)", key, e);
            return true;
        }
    }

    /** Clear a key (e.g. after a successful login). */
    public void reset(String key) {
        try {
            jdbc.update("DELETE FROM rate_limit_windows WHERE rl_key = ?", key);
        } catch (Exception e) {
            log.warn("Distributed rate-limit reset failed for key={}", key, e);
        }
    }

    /**
     * Prune windows that have not been touched in a day so the table stays bounded by recently-active
     * keys. Any window older than that has long since rolled over, so deleting it only reclaims space.
     */
    @Scheduled(fixedDelay = 3_600_000L) // hourly
    public void pruneStaleWindows() {
        try {
            int removed = jdbc.update(
                "DELETE FROM rate_limit_windows WHERE window_start < now() - interval '1 day'");
            if (removed > 0) {
                log.debug("Pruned {} stale rate-limit windows", removed);
            }
        } catch (Exception e) {
            log.warn("Rate-limit window prune failed", e);
        }
    }
}
