package com.bcits.works.security;

import com.bcits.works.shared.RbacGate;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/**
 * Records and reads the audit log of "saved/automated" BQL runs (RB-20 §5). The single write point
 * so every named run is captured identically, whoever triggers it (a user opening a saved view, or
 * the subscription scheduler).
 */
@Service
public class BqlRunAuditService {

    private static final int MAX_PAGE = 200;

    private final BqlRunAuditRepository repo;
    private final RbacGate rbac;

    public BqlRunAuditService(BqlRunAuditRepository repo, RbacGate rbac) {
        this.repo = repo;
        this.rbac = rbac;
    }

    /** Append one run record. {@code userId} may be null for a scheduler-driven run. */
    public void record(String workspaceId, String userId, BqlRunAudit.Source source,
                       String sourceId, String bql, int resultCount) {
        BqlRunAudit a = new BqlRunAudit();
        a.setId("BRA-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        a.setWorkspaceId(workspaceId);
        a.setUserId(userId);
        a.setSource(source.name());
        a.setSourceId(sourceId);
        a.setBql(bql);
        a.setResultCount(resultCount);
        a.setOccurredAt(OffsetDateTime.now());
        repo.save(a);
    }

    /** Read the workspace's audit log (newest first). Requires {@code manage_projects} — admin-ish. */
    public List<BqlRunAudit> list(String callerId, String workspaceId, int limit) {
        rbac.require(callerId, workspaceId, "manage_projects");
        int size = Math.max(1, Math.min(limit, MAX_PAGE));
        return repo.findByWorkspaceIdOrderByOccurredAtDesc(workspaceId, PageRequest.of(0, size));
    }
}
