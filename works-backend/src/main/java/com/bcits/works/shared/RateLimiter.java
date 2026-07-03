package com.bcits.works.shared;

import com.bcits.works.DbRateLimitStore;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fixed-window rate limiter for auth + AI endpoints (RB-10 §8).
 *
 * <p>Two interchangeable backends behind one unchanged {@code allow()/reset()} API (callers never
 * change): an in-process {@link ConcurrentHashMap} (default) and, when {@code app.rate-limit.distributed}
 * is on, the DB-backed {@link DbRateLimitStore} (V118) — which enforces the limit <b>across all
 * horizontally-scaled instances</b> (the in-memory store counts per JVM, so N instances = N x budget).
 * Redis is the deferred AWS-infra follow-up; this is the no-new-dependency interim.
 *
 * <p>Default off ⇒ merging PR3 changes nothing; an operator flips it on for a multi-instance deploy.
 * Fail behaviour: once a key exceeds its budget within the window, attempts are rejected until the
 * window rolls over; the DB store fails OPEN on a store outage (a shared-store blip must not lock all
 * auth out — {@link DbRateLimitStore}).
 */
@Component
public class RateLimiter {

    private record Window(long windowStartMillis, int count) {}

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /** When non-null AND {@code distributed}, attempts are counted in the shared DB store. */
    private final DbRateLimitStore distributedStore;
    private final boolean distributed;

    /** No-arg: in-memory only. Used by unit tests and as the safe default if no store is wired. */
    public RateLimiter() {
        this.distributedStore = null;
        this.distributed = false;
    }

    @Autowired
    public RateLimiter(DbRateLimitStore distributedStore,
                       @Value("${app.rate-limit.distributed:false}") boolean distributed) {
        this.distributedStore = distributedStore;
        this.distributed = distributed;
    }

    /** Production entry point. Delegates to the shared DB store when distributed, else in-process. */
    public boolean allow(String key, int maxAttempts, long windowSeconds) {
        if (distributed && distributedStore != null) {
            return distributedStore.allow(key, maxAttempts, windowSeconds * 1000L);
        }
        return allow(key, maxAttempts, windowSeconds * 1000L, System.currentTimeMillis());
    }

    /**
     * Pure, time-injectable in-memory core (unit-tested). Returns true if the attempt is within budget.
     * The attempt is counted whether or not it is allowed, so a caller cannot reset the window by
     * spamming past the limit.
     */
    public boolean allow(String key, int maxAttempts, long windowMillis, long nowMillis) {
        Window updated = windows.compute(key, (k, current) -> {
            if (current == null || nowMillis - current.windowStartMillis() >= windowMillis) {
                return new Window(nowMillis, 1);
            }
            return new Window(current.windowStartMillis(), current.count() + 1);
        });
        return updated.count() <= maxAttempts;
    }

    /** Clear a key (e.g. after a successful login). Clears both backends so a switch can't strand a key. */
    public void reset(String key) {
        if (distributed && distributedStore != null) {
            distributedStore.reset(key);
        }
        windows.remove(key);
    }
}
