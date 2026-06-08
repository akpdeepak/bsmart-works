package com.bcits.works;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fixed-window, in-memory rate limiter for auth endpoints (RB-10 §8).
 *
 * In-process is the correct scope for the modular monolith today; a shared store (Redis) is an
 * extraction-time concern (ADR-0001). Fail-closed: once a key exceeds its budget within the window,
 * further attempts are rejected until the window rolls over.
 */
@Component
public class RateLimiter {

    private record Window(long windowStartMillis, int count) {}

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /** Production entry point — uses wall-clock time. */
    public boolean allow(String key, int maxAttempts, long windowSeconds) {
        return allow(key, maxAttempts, windowSeconds * 1000L, System.currentTimeMillis());
    }

    /**
     * Pure, time-injectable core (unit-tested). Returns true if the attempt is within budget.
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

    /** Clear a key (e.g. after a successful login). */
    public void reset(String key) {
        windows.remove(key);
    }
}
