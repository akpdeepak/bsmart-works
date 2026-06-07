package com.example.demo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

/** The tamper-evident audit log. Every finder is workspace-scoped (RB-40 §1); the append-only
 *  contract is enforced in the DB (V50 trigger) — there is intentionally no update/delete path. */
public interface AuditLogEntryRepository extends JpaRepository<AuditLogEntry, Long> {

    List<AuditLogEntry> findByWorkspaceIdOrderBySeqAsc(String workspaceId);

    List<AuditLogEntry> findByWorkspaceIdAndSeqGreaterThanOrderBySeqAsc(String workspaceId, long seq);

    Optional<AuditLogEntry> findByWorkspaceIdAndSeq(String workspaceId, long seq);

    @Query("SELECT COALESCE(MAX(e.seq), 0) FROM AuditLogEntry e WHERE e.workspaceId = :ws")
    long maxSeq(@Param("ws") String workspaceId);

    // Browsable, filtered slice for the audit-log explorer. Blank filters (empty string) match all.
    @Query("""
            SELECT e FROM AuditLogEntry e
            WHERE e.workspaceId = :ws
              AND (:action = '' OR e.action = :action)
              AND (:actor  = '' OR e.actorId = :actor)
              AND (:q = '' OR LOWER(e.detail) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY e.seq DESC
            """)
    Page<AuditLogEntry> search(@Param("ws") String workspaceId,
                               @Param("action") String action,
                               @Param("actor") String actor,
                               @Param("q") String q,
                               Pageable pageable);
}
