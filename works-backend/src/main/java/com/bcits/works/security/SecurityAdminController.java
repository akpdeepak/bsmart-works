package com.bcits.works.security;

import com.bcits.works.AnomalyDetectionService;
import com.bcits.works.AnomalyDetector;
import com.bcits.works.auth.api.ConditionalAccessEvaluator;
import com.bcits.works.auth.api.ConditionalAccessPolicy;
import com.bcits.works.auth.api.ConditionalAccessService;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.KeyRotationService;
import com.bcits.works.shared.RbacGate;
import com.bcits.works.shared.WorkspaceSecuritySettings;
import com.bcits.works.shared.WorkspaceSecuritySettingsService;
import com.bcits.works.shared.dto.AnomalySignalRequest;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Enterprise security administration (iteration 19 Cap T, RB-40 §4): workspace security settings
 * (data residency + BYOK), conditional-access policies, access anomalies, and SIEM streaming. RBAC
 * is enforced here at the service boundary (RB-10 §2) — reads need {@code view_audit_log}, writes
 * need {@code manage_security} — and every endpoint is workspace-scoped (RB-40 §1), so one tenant
 * can never read or alter another's security configuration.
 */
@RestController
@RequestMapping("/api/v1/security")
public class SecurityAdminController {

    private final WorkspaceSecuritySettingsService settings;
    private final ConditionalAccessService conditionalAccess;
    private final AnomalyDetectionService anomalies;
    private final AuditStreamService streams;
    private final KeyRotationService keyRotation;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public SecurityAdminController(WorkspaceSecuritySettingsService settings,
                                   ConditionalAccessService conditionalAccess,
                                   AnomalyDetectionService anomalies,
                                   AuditStreamService streams,
                                   KeyRotationService keyRotation,
                                   AuthenticatedUser authenticatedUser, RbacGate rbac) {
        this.settings = settings;
        this.keyRotation = keyRotation;
        this.conditionalAccess = conditionalAccess;
        this.anomalies = anomalies;
        this.streams = streams;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    // ── Settings — data residency + BYOK ──────────────────────────────────────────────────────

    @GetMapping("/settings")
    public WorkspaceSecuritySettings settings(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_audit_log");
        return settings.get(workspaceId);
    }

    @PutMapping("/settings")
    public WorkspaceSecuritySettings updateSettings(@RequestParam String workspaceId,
                                                    @RequestBody WorkspaceSecuritySettings body) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        return settings.update(workspaceId, userId, body);
    }

    // ── Conditional access ────────────────────────────────────────────────────────────────────

    @GetMapping("/conditional-access")
    public List<ConditionalAccessPolicy> policies(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_audit_log");
        return conditionalAccess.list(workspaceId);
    }

    @PostMapping("/conditional-access")
    public ConditionalAccessPolicy createPolicy(@RequestParam String workspaceId,
                                                @RequestBody ConditionalAccessPolicy body) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        return conditionalAccess.create(workspaceId, userId, body);
    }

    @PutMapping("/conditional-access/{id}")
    public ConditionalAccessPolicy updatePolicy(@RequestParam String workspaceId,
                                                @PathVariable String id,
                                                @RequestBody ConditionalAccessPolicy body) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        return conditionalAccess.update(workspaceId, userId, id, body);
    }

    @DeleteMapping("/conditional-access/{id}")
    public void deletePolicy(@RequestParam String workspaceId, @PathVariable String id) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        conditionalAccess.delete(workspaceId, userId, id);
    }

    /** Preview how the policies would judge a hypothetical access — the admin "what-if" tool. */
    @GetMapping("/conditional-access/evaluate")
    public ConditionalAccessEvaluator.Decision evaluate(@RequestParam String workspaceId,
                                                        @RequestParam(required = false) String role,
                                                        @RequestParam String ip,
                                                        @RequestParam(required = false) String country,
                                                        @RequestParam(defaultValue = "false") boolean deviceTrusted) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_audit_log");
        return conditionalAccess.evaluate(workspaceId, role, ip, country, deviceTrusted);
    }

    // ── Access anomalies ──────────────────────────────────────────────────────────────────────

    @GetMapping("/anomalies")
    public List<AccessAnomaly> anomalies(@RequestParam String workspaceId,
                                         @RequestParam(required = false) String status) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_audit_log");
        return anomalies.list(workspaceId, status);
    }

    @PostMapping("/anomalies/analyze")
    public List<AccessAnomaly> analyze(@RequestParam String workspaceId,
                                       @RequestBody AnomalySignalRequest req) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_security");
        return anomalies.analyze(workspaceId, new AnomalyDetector.AccessSignal(
                req.userId(), req.countryCode(), req.usualCountries(), req.localHour(),
                req.exportedInWindow(), req.dailyExportNorm(), req.privilegeEscalated(),
                req.minutesSincePrevLogin(), req.differentCountryThanPrev()));
    }

    @PostMapping("/anomalies/{id}/resolve")
    public AccessAnomaly resolveAnomaly(@RequestParam String workspaceId, @PathVariable String id,
                                        @RequestParam(defaultValue = "false") boolean dismiss) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        return anomalies.resolve(workspaceId, userId, id, dismiss);
    }

    // ── BYOK key rotation (B31) ───────────────────────────────────────────────────────────────

    @PostMapping("/rotate-key")
    public KeyRotationService.RotationResult rotateKey(@RequestParam String workspaceId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        return keyRotation.rotate(workspaceId, userId);
    }

    // ── SIEM streaming ────────────────────────────────────────────────────────────────────────

    @GetMapping("/streams")
    public List<AuditLogStreamConfig> streams(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_audit_log");
        return streams.list(workspaceId);
    }

    @PostMapping("/streams")
    public AuditLogStreamConfig createStream(@RequestParam String workspaceId,
                                             @RequestBody AuditLogStreamConfig body) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        return streams.create(workspaceId, userId, body);
    }

    @DeleteMapping("/streams/{id}")
    public void deleteStream(@RequestParam String workspaceId, @PathVariable String id) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_security");
        streams.delete(workspaceId, userId, id);
    }

    @PostMapping("/streams/{id}/drain")
    public List<String> drainStream(@RequestParam String workspaceId, @PathVariable String id) {
        rbac.require(authenticatedUser.id(), workspaceId, "manage_security");
        return streams.drain(workspaceId, id);
    }
}
