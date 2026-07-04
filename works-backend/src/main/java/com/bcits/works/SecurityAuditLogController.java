package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.PageResponse;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The browsable, tamper-evident security audit log (iteration 19 Cap T, RB-40 §4): filter/search,
 * cryptographic chain verification, and export. RBAC is enforced at the service boundary
 * (RB-10 §2) — every endpoint requires {@code view_audit_log} — and is workspace-scoped (RB-40 §1).
 * The log is append-only (DB-enforced); there is intentionally no write endpoint here.
 */
@RestController
@RequestMapping("/api/v1/security/audit-log")
public class SecurityAuditLogController {

    private final SecurityAuditLogService auditLog;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public SecurityAuditLogController(SecurityAuditLogService auditLog, AuthenticatedUser authenticatedUser,
                             RbacService rbac) {
        this.auditLog = auditLog;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public PageResponse<AuditLogEntry> search(@RequestParam String workspaceId,
                                              @RequestParam(required = false) String action,
                                              @RequestParam(required = false) String actor,
                                              @RequestParam(required = false) String q,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "50") int size) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_audit_log");
        return auditLog.search(workspaceId, action, actor, q, page, size);
    }

    /** Recompute the hash chain and report whether the log is intact (tamper detection). */
    @GetMapping("/verify")
    public AuditHashChain.Result verify(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_audit_log");
        return auditLog.verify(workspaceId);
    }

    /** Full chronological export (CSV/PDF rendering happens client-side via the shared export lib). */
    @GetMapping("/export")
    public List<AuditLogEntry> export(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_audit_log");
        return auditLog.all(workspaceId);
    }
}
