package com.bcits.works;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

/**
 * Per-workspace security settings (iteration 19 Cap T, RB-40 §4): data residency region, BYOK
 * (customer-managed key <em>reference</em> only — key material never touches us), encryption
 * algorithm, audit retention, anomaly toggle. Workspace-scoped (RB-40 §1); the controller applies
 * RBAC ({@code manage_security} to write). A workspace with no row uses platform defaults.
 */
@Service
public class WorkspaceSecuritySettingsService {

    private static final Set<String> REGIONS = Set.of("IN", "EU", "US", "AP", "UK");
    private static final Set<String> PROVIDERS = Set.of("AWS_KMS", "AZURE_KV", "GCP_KMS");
    private static final List<String> ALGORITHMS = List.of("AES-256-GCM", "AES-256-CBC");

    private final WorkspaceSecuritySettingsRepository repo;
    private final SecurityAuditLogService auditLog;

    public WorkspaceSecuritySettingsService(WorkspaceSecuritySettingsRepository repo,
                                            SecurityAuditLogService auditLog) {
        this.repo = repo;
        this.auditLog = auditLog;
    }

    /** Current settings, or the platform defaults (residency IN, no BYOK) when none are stored. */
    public WorkspaceSecuritySettings get(String workspaceId) {
        return repo.findById(workspaceId).orElseGet(() -> {
            WorkspaceSecuritySettings s = new WorkspaceSecuritySettings();
            s.setWorkspaceId(workspaceId);
            return s;
        });
    }

    public WorkspaceSecuritySettings update(String workspaceId, String actorId,
                                            WorkspaceSecuritySettings in) {
        String region = upper(in.getDataResidencyRegion());
        if (!REGIONS.contains(region)) {
            throw ApiException.badRequest("INVALID_REGION",
                    "Data residency region must be one of " + REGIONS + ".");
        }
        if (!ALGORITHMS.contains(in.getEncryptionAlgorithm())) {
            throw ApiException.badRequest("INVALID_ALGORITHM",
                    "Encryption algorithm must be one of " + ALGORITHMS + ".");
        }
        if (in.isByokEnabled()) {
            if (in.getByokProvider() == null || !PROVIDERS.contains(upper(in.getByokProvider()))) {
                throw ApiException.badRequest("INVALID_BYOK",
                        "A BYOK provider (" + PROVIDERS + ") is required when BYOK is enabled.");
            }
            if (in.getByokKeyRef() == null || in.getByokKeyRef().isBlank()) {
                throw ApiException.badRequest("INVALID_BYOK",
                        "A key reference (KMS ARN / key id) is required when BYOK is enabled.");
            }
        }
        if (in.getAuditRetentionDays() < 30) {
            throw ApiException.badRequest("INVALID_RETENTION",
                    "Audit retention must be at least 30 days.");
        }

        WorkspaceSecuritySettings s = get(workspaceId);
        s.setWorkspaceId(workspaceId);
        s.setDataResidencyRegion(region);
        s.setByokEnabled(in.isByokEnabled());
        s.setByokProvider(in.isByokEnabled() ? upper(in.getByokProvider()) : null);
        s.setByokKeyRef(in.isByokEnabled() ? in.getByokKeyRef().trim() : null);
        s.setEncryptionAlgorithm(in.getEncryptionAlgorithm());
        s.setAuditRetentionDays(in.getAuditRetentionDays());
        s.setAnomalyDetectionEnabled(in.isAnomalyDetectionEnabled());
        s.setUpdatedBy(actorId);
        s.setUpdatedAt(OffsetDateTime.now());
        WorkspaceSecuritySettings saved = repo.save(s);

        auditLog.record(workspaceId, actorId, "SECURITY_SETTINGS_UPDATED", "workspace", workspaceId,
                "residency=" + saved.getDataResidencyRegion()
                        + ", byok=" + (saved.isByokEnabled() ? saved.getByokProvider() : "off")
                        + ", anomalyDetection=" + saved.isAnomalyDetectionEnabled());
        return saved;
    }

    private String upper(String s) {
        return s == null ? "" : s.trim().toUpperCase();
    }
}
