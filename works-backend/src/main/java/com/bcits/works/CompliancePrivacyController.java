package com.bcits.works;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * Compliance certifications + data-subject rights (iteration 19 Cap T): GDPR/DPDP export & erasure,
 * SOC 2 / ISO 27001 evidence bundles, and the pen-test assurance register. RBAC at the service
 * boundary (RB-10 §2) — reads need {@code view_audit_log}, writes need {@code manage_security} —
 * and every endpoint is workspace-scoped (RB-40 §1).
 */
@RestController
@RequestMapping("/api/v1/security")
public class CompliancePrivacyController {

    private final DataPrivacyService privacy;
    private final ComplianceEvidenceService evidence;
    private final PentestService pentests;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public CompliancePrivacyController(DataPrivacyService privacy, ComplianceEvidenceService evidence,
                                       PentestService pentests, AuthenticatedUser authenticatedUser,
                                       RbacService rbac) {
        this.privacy = privacy;
        this.evidence = evidence;
        this.pentests = pentests;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    // ── Data subject requests (GDPR / DPDP) ───────────────────────────────────────────────────

    @GetMapping("/data-requests")
    public List<DataSubjectRequest> dataRequests(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_audit_log");
        return privacy.list(workspaceId);
    }

    @PostMapping("/data-requests/export")
    public DataSubjectRequest export(@RequestParam String workspaceId,
                                     @RequestParam String subjectUserId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        return privacy.export(workspaceId, userId, subjectUserId);
    }

    @PostMapping("/data-requests/erase")
    public DataSubjectRequest erase(@RequestParam String workspaceId,
                                    @RequestParam String subjectUserId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        return privacy.erase(workspaceId, userId, subjectUserId);
    }

    // ── Compliance evidence bundles ───────────────────────────────────────────────────────────

    @GetMapping("/evidence")
    public List<ComplianceEvidenceBundle> evidence(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_audit_log");
        return evidence.list(workspaceId);
    }

    @PostMapping("/evidence/generate")
    public ComplianceEvidenceBundle generate(@RequestParam String workspaceId,
                                             @RequestParam String framework,
                                             @RequestParam(required = false)
                                             @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodStart,
                                             @RequestParam(required = false)
                                             @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodEnd) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        return evidence.generate(workspaceId, userId, framework, periodStart, periodEnd);
    }

    @PostMapping("/evidence/{id}/download")
    public ComplianceEvidenceBundle download(@RequestParam String workspaceId, @PathVariable String id) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        return evidence.markDownloaded(workspaceId, userId, id);
    }

    // ── Pen-test register ─────────────────────────────────────────────────────────────────────

    @GetMapping("/pentests")
    public List<PentestEngagement> pentests(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_audit_log");
        return pentests.list(workspaceId);
    }

    @PostMapping("/pentests")
    public PentestEngagement createPentest(@RequestParam String workspaceId,
                                           @RequestBody PentestEngagement body) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        return pentests.create(workspaceId, userId, body);
    }

    @PutMapping("/pentests/{id}")
    public PentestEngagement updatePentest(@RequestParam String workspaceId, @PathVariable String id,
                                           @RequestBody PentestEngagement body) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        return pentests.update(workspaceId, userId, id, body);
    }
}
