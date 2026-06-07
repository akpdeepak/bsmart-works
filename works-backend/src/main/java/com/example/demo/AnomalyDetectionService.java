package com.example.demo;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Access-anomaly detection (iteration 19 Cap T, RB-40 §4). The heuristics live in the pure
 * {@link AnomalyDetector} (the deterministic fallback an AI tier enriches, RB-40 §2). This service
 * persists findings, lists them, and lets an admin resolve/dismiss. Workspace-scoped (RB-40 §1);
 * the controller applies RBAC ({@code view_audit_log} to read, {@code manage_security} to act).
 * Detection honours the per-workspace {@code anomaly_detection_enabled} toggle.
 */
@Service
public class AnomalyDetectionService {

    private final AccessAnomalyRepository repo;
    private final WorkspaceSecuritySettingsService settings;
    private final AuditLogService auditLog;

    public AnomalyDetectionService(AccessAnomalyRepository repo,
                                   WorkspaceSecuritySettingsService settings,
                                   AuditLogService auditLog) {
        this.repo = repo;
        this.settings = settings;
        this.auditLog = auditLog;
    }

    public List<AccessAnomaly> list(String workspaceId, String status) {
        return (status == null || status.isBlank())
                ? repo.findByWorkspaceIdOrderByDetectedAtDesc(workspaceId)
                : repo.findByWorkspaceIdAndStatusOrderByDetectedAtDesc(workspaceId, status.toUpperCase());
    }

    /** Run detection on a signal, persisting any findings. Returns the anomalies created. */
    public List<AccessAnomaly> analyze(String workspaceId, AnomalyDetector.AccessSignal signal) {
        if (!settings.get(workspaceId).isAnomalyDetectionEnabled()) {
            return List.of();   // disabled for this workspace
        }
        List<AnomalyDetector.Finding> findings = AnomalyDetector.detect(signal);
        return findings.stream().map(f -> {
            AccessAnomaly a = new AccessAnomaly();
            a.setId("ANM-" + UUID.randomUUID().toString().substring(0, 12));
            a.setWorkspaceId(workspaceId);
            a.setSubjectUserId(signal.userId());
            a.setType(f.type());
            a.setSeverity(f.severity());
            a.setSummary(f.summary());
            a.setEvidence(f.evidence());
            a.setDetectedAt(OffsetDateTime.now());
            a.setStatus("OPEN");
            AccessAnomaly saved = repo.save(a);
            auditLog.record(workspaceId, "system", "ANOMALY_DETECTED", "user", signal.userId(),
                    f.type() + " (" + f.severity() + "): " + f.summary());
            return saved;
        }).toList();
    }

    public AccessAnomaly resolve(String workspaceId, String actorId, String id, boolean dismiss) {
        AccessAnomaly a = scoped(workspaceId, id);
        a.setStatus(dismiss ? "DISMISSED" : "RESOLVED");
        a.setResolvedBy(actorId);
        a.setResolvedAt(OffsetDateTime.now());
        AccessAnomaly saved = repo.save(a);
        auditLog.record(workspaceId, actorId, dismiss ? "ANOMALY_DISMISSED" : "ANOMALY_RESOLVED",
                "anomaly", id, a.getType());
        return saved;
    }

    private AccessAnomaly scoped(String workspaceId, String id) {
        AccessAnomaly a = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Anomaly", id));
        if (!a.getWorkspaceId().equals(workspaceId)) {
            throw ApiException.notFound("Anomaly", id);
        }
        return a;
    }
}
