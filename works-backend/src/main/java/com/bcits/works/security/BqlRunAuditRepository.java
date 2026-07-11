package com.bcits.works.security;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** Append-only store of saved-view / subscription BQL runs (RB-20 §5). */
public interface BqlRunAuditRepository extends JpaRepository<BqlRunAudit, String> {

    /** Newest-first audit rows for a workspace — the admin audit-log read path. */
    List<BqlRunAudit> findByWorkspaceIdOrderByOccurredAtDesc(String workspaceId, Pageable pageable);
}
