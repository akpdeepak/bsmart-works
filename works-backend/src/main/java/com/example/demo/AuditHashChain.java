package com.example.demo;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;

/**
 * The cryptographic spine of the tamper-evident security audit log (RB-40 §4; iteration 19 Cap T).
 *
 * <p>Each entry's {@code entry_hash} is SHA-256 over a canonical string that includes the
 * <em>previous</em> entry's hash, so the log forms a hash chain (a mini-blockchain). Any insertion,
 * deletion, reordering or field edit anywhere in a workspace's history breaks the chain from that
 * point on, and {@link #verify} pinpoints the first broken link. The genesis link uses
 * {@link #GENESIS} (64 zeros) as its previous hash.
 *
 * <p>The canonical form is intentionally simple and stable so it can be reproduced verbatim in SQL
 * (see the seed in {@code V51}) — never change it without a forward migration that re-chains.
 *
 * <p>Pure and deterministic: no Spring, no DB — unit-testable in isolation (RB-10 §2).
 */
public final class AuditHashChain {

    /** Previous-hash sentinel for the first entry in a workspace's chain. */
    public static final String GENESIS = "0".repeat(64);

    private AuditHashChain() {}

    /** The exact string that gets hashed for one entry. Mirrors the SQL seed in V51. */
    public static String canonical(String prevHash, String workspaceId, long seq, String actorId,
                                   String action, String targetType, String targetId,
                                   OffsetDateTime occurredAt, String detail) {
        return String.join(":",
                prevHash,
                nz(workspaceId),
                Long.toString(seq),
                nz(actorId),
                nz(action),
                nz(targetType),
                nz(targetId),
                Long.toString(occurredAt.toEpochSecond()),
                nz(detail));
    }

    /** SHA-256 (hex, lower-case) of the canonical string for one entry. */
    public static String hash(String prevHash, String workspaceId, long seq, String actorId,
                              String action, String targetType, String targetId,
                              OffsetDateTime occurredAt, String detail) {
        return sha256Hex(canonical(prevHash, workspaceId, seq, actorId, action, targetType,
                targetId, occurredAt, detail));
    }

    /** Convenience: compute the hash an {@link AuditLogEntry} should carry given its prev_hash. */
    public static String hashOf(AuditLogEntry e) {
        return hash(e.getPrevHash(), e.getWorkspaceId(), e.getSeq(), e.getActorId(), e.getAction(),
                e.getTargetType(), e.getTargetId(), e.getOccurredAt(), e.getDetail());
    }

    /**
     * Verify a workspace's entries, ordered by ascending seq. Returns a {@link Result} whose
     * {@code intact} is true only if every link's prev_hash matches the prior entry's entry_hash,
     * each entry_hash recomputes correctly, and seq is contiguous from 1.
     */
    public static Result verify(List<AuditLogEntry> orderedBySeq) {
        String expectedPrev = GENESIS;
        long expectedSeq = 1;
        for (AuditLogEntry e : orderedBySeq) {
            if (e.getSeq() != expectedSeq) {
                return Result.broken(e.getSeq(), "Sequence gap: expected " + expectedSeq
                        + " but found " + e.getSeq());
            }
            if (!expectedPrev.equals(e.getPrevHash())) {
                return Result.broken(e.getSeq(), "Broken chain link: prev_hash does not match the "
                        + "previous entry's hash");
            }
            String recomputed = hashOf(e);
            if (!recomputed.equals(e.getEntryHash())) {
                return Result.broken(e.getSeq(), "Entry has been altered: hash does not match its "
                        + "contents");
            }
            expectedPrev = e.getEntryHash();
            expectedSeq++;
        }
        return Result.intact(orderedBySeq.size());
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /** Outcome of a chain verification. */
    public record Result(boolean intact, long verifiedCount, Long brokenAtSeq, String reason) {
        static Result intact(long count) {
            return new Result(true, count, null, null);
        }
        static Result broken(long seq, String reason) {
            return new Result(false, seq - 1, seq, reason);
        }
    }
}
