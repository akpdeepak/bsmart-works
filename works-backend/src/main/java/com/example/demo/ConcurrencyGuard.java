package com.example.demo;

/**
 * Optimistic-concurrency helper for work-item updates (iteration 1 follow-up — the spec
 * promised "optimistic concurrency" but the version field was never checked). A client sends
 * the version it last read; if the stored version has since advanced, the write is stale and
 * is rejected with 409. Backward-compatible: a client that sends no version is not checked.
 * Pure + static — unit-testable in isolation.
 */
public final class ConcurrencyGuard {

    private ConcurrencyGuard() {}

    /** Reject a stale write: both versions present and unequal → 409 Conflict. */
    public static void requireCurrentVersion(Integer storedVersion, Integer incomingVersion) {
        if (incomingVersion != null && storedVersion != null && !storedVersion.equals(incomingVersion)) {
            throw ApiException.conflict("This work item was changed by someone else. Refresh and try again.");
        }
    }

    /** The next version number, null-safe (treats null as 0). */
    public static int nextVersion(Integer current) {
        return (current == null ? 0 : current) + 1;
    }
}
