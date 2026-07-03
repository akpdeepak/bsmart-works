package com.bcits.works;

import com.bcits.works.shared.PageResponse;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * The tamper-evident security audit log (iteration 19 Cap T, RB-40 §4). Every security-relevant
 * action appends one hash-chained entry here. Distinct from the domain event store ({@code events}):
 * this is the admin-facing, forensic-grade access/security trail with browse, export, SIEM
 * streaming and cryptographic verification.
 *
 * <p>The chain ({@link AuditHashChain}) makes the log tamper-evident: each entry's hash folds in the
 * previous entry's hash, and the DB blocks UPDATE/DELETE (V52 trigger), so any alteration is
 * detectable by {@link #verify}. Callers apply RBAC + workspace scoping before recording.
 */
@Service
public class SecurityAuditLogService {

    private final AuditLogEntryRepository repo;

    public SecurityAuditLogService(AuditLogEntryRepository repo) {
        this.repo = repo;
    }

    /**
     * Append one entry to a workspace's chain. Transactional so the seq read + write is atomic; the
     * (workspace_id, seq) unique constraint is the backstop against a concurrent appender.
     */
    @Transactional
    public AuditLogEntry record(String workspaceId, String actorId, String action,
                                String targetType, String targetId, String detail,
                                String ipAddress, String userAgent) {
        long prevSeq = repo.maxSeq(workspaceId);
        long seq = prevSeq + 1;
        String prevHash = prevSeq == 0
                ? AuditHashChain.GENESIS
                : repo.findByWorkspaceIdAndSeq(workspaceId, prevSeq)
                      .map(AuditLogEntry::getEntryHash)
                      .orElse(AuditHashChain.GENESIS);

        AuditLogEntry e = new AuditLogEntry();
        e.setWorkspaceId(workspaceId);
        e.setSeq(seq);
        e.setActorId(actorId);
        e.setAction(action);
        e.setTargetType(targetType);
        e.setTargetId(targetId);
        e.setDetail(detail);
        e.setIpAddress(ipAddress);
        e.setUserAgent(userAgent);
        e.setOccurredAt(OffsetDateTime.now());
        e.setPrevHash(prevHash);
        e.setEntryHash(AuditHashChain.hash(prevHash, workspaceId, seq, actorId, action,
                targetType, targetId, e.getOccurredAt(), detail));
        return repo.save(e);
    }

    /** Convenience overload without request metadata (for server-internal actions). */
    public AuditLogEntry record(String workspaceId, String actorId, String action,
                                String targetType, String targetId, String detail) {
        return record(workspaceId, actorId, action, targetType, targetId, detail, null, null);
    }

    public List<AuditLogEntry> all(String workspaceId) {
        return repo.findByWorkspaceIdOrderBySeqAsc(workspaceId);
    }

    /** Browsable, filtered, paginated slice for the audit-log explorer. Blank filters match all. */
    public PageResponse<AuditLogEntry> search(String workspaceId, String action, String actor,
                                              String q, int page, int size) {
        int safeSize = Math.min(200, Math.max(1, size));
        return PageResponse.of(repo.search(workspaceId, nz(action), nz(actor), nz(q),
                PageRequest.of(Math.max(0, page), safeSize)));
    }

    private static String nz(String s) {
        return s == null ? "" : s.trim();
    }

    /** Re-derive the whole chain and report whether it is intact (tamper check). */
    public AuditHashChain.Result verify(String workspaceId) {
        return AuditHashChain.verify(repo.findByWorkspaceIdOrderBySeqAsc(workspaceId));
    }
}
