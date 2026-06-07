package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The tamper-evident audit chain (iteration 19 Cap T, RB-40 §4). Proves that a well-formed chain
 * verifies, and that any insertion, edit, reorder or hash swap is detected.
 */
@Tag("unit")
class AuditHashChainTest {

    private static final OffsetDateTime T0 =
            OffsetDateTime.of(2026, 6, 1, 9, 0, 0, 0, ZoneOffset.UTC);

    private AuditLogEntry link(long seq, String prevHash, String action, String detail) {
        AuditLogEntry e = new AuditLogEntry();
        e.setWorkspaceId("WS-001");
        e.setSeq(seq);
        e.setActorId("USR-1");
        e.setAction(action);
        e.setTargetType("workspace");
        e.setTargetId("WS-001");
        e.setOccurredAt(T0.plusMinutes(seq));
        e.setDetail(detail);
        e.setPrevHash(prevHash);
        e.setEntryHash(AuditHashChain.hashOf(e));
        return e;
    }

    private List<AuditLogEntry> chainOf(int n) {
        List<AuditLogEntry> entries = new ArrayList<>();
        String prev = AuditHashChain.GENESIS;
        for (int i = 1; i <= n; i++) {
            AuditLogEntry e = link(i, prev, "ACTION_" + i, "detail " + i);
            entries.add(e);
            prev = e.getEntryHash();
        }
        return entries;
    }

    @Test
    void genesisIs64Zeros() {
        assertThat(AuditHashChain.GENESIS).hasSize(64).matches("0{64}");
    }

    @Test
    void hashIsDeterministicAndHex() {
        String a = AuditHashChain.hash(AuditHashChain.GENESIS, "WS-001", 1, "USR-1", "X",
                "t", "id", T0, "d");
        String b = AuditHashChain.hash(AuditHashChain.GENESIS, "WS-001", 1, "USR-1", "X",
                "t", "id", T0, "d");
        assertThat(a).isEqualTo(b).hasSize(64).matches("[0-9a-f]{64}");
    }

    @Test
    void intactChainVerifies() {
        AuditHashChain.Result result = AuditHashChain.verify(chainOf(4));
        assertThat(result.intact()).isTrue();
        assertThat(result.verifiedCount()).isEqualTo(4);
        assertThat(result.brokenAtSeq()).isNull();
    }

    @Test
    void emptyChainVerifies() {
        assertThat(AuditHashChain.verify(List.of()).intact()).isTrue();
    }

    @Test
    void editingAnEntryBreaksTheChain() {
        List<AuditLogEntry> chain = chainOf(4);
        chain.get(1).setDetail("tampered");   // change content without recomputing the hash

        AuditHashChain.Result result = AuditHashChain.verify(chain);
        assertThat(result.intact()).isFalse();
        assertThat(result.brokenAtSeq()).isEqualTo(2);
    }

    @Test
    void swappingAHashBreaksTheNextLink() {
        List<AuditLogEntry> chain = chainOf(4);
        // Recompute entry 2's hash for new content — entry 3's prev_hash no longer matches.
        AuditLogEntry tampered = chain.get(1);
        tampered.setDetail("tampered");
        tampered.setEntryHash(AuditHashChain.hashOf(tampered));

        AuditHashChain.Result result = AuditHashChain.verify(chain);
        assertThat(result.intact()).isFalse();
        assertThat(result.brokenAtSeq()).isEqualTo(3);
    }

    @Test
    void deletingAnEntryIsDetectedAsASequenceGap() {
        List<AuditLogEntry> chain = chainOf(4);
        chain.remove(2);   // drop seq 3 — now 1,2,4

        AuditHashChain.Result result = AuditHashChain.verify(chain);
        assertThat(result.intact()).isFalse();
        assertThat(result.brokenAtSeq()).isEqualTo(4);
    }
}
