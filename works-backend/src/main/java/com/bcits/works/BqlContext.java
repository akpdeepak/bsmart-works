package com.bcits.works;

/**
 * Compile-time context for a BQL query: who is asking and what they're allowed to query.
 *
 * <p>Carries the {@code currentUser()} binding and the field-level-security gate
 * ({@link #canSeeSensitive()}). The legacy two-arg {@code compile(query, userId)} path builds a
 * context that <b>can</b> see sensitive fields, preserving behaviour for the internal/server-side
 * consumers (KPIs, SLA, compliance) that compile trusted BQL; the user-facing controller builds a
 * context gated by {@link RbacService}.
 */
public record BqlContext(String currentUserId, boolean canSeeSensitive) {

    /** Internal/server-side callers compiling trusted BQL — full field visibility. */
    public static BqlContext trusted(String currentUserId) {
        return new BqlContext(currentUserId, true);
    }

    /** A user-facing caller; {@code sensitive} comes from the role gate. */
    public static BqlContext forUser(String currentUserId, boolean canSeeSensitive) {
        return new BqlContext(currentUserId, canSeeSensitive);
    }
}
