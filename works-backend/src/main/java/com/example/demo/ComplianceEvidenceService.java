package com.example.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * One-click SOC 2 Type 2 / ISO 27001 evidence bundles (iteration 19 Cap T). Generating a bundle
 * snapshots the workspace's live security posture into a control-coverage summary — the audit
 * chain's integrity, encryption + residency, access controls, anomaly monitoring, and the
 * pen-test register — which the admin can package and send under NDA. Workspace-scoped (RB-40 §1);
 * the controller applies RBAC ({@code manage_security}).
 */
@Service
public class ComplianceEvidenceService {

    private static final Set<String> FRAMEWORKS = Set.of("SOC2_TYPE2", "ISO_27001");

    private final ComplianceEvidenceBundleRepository bundles;
    private final WorkspaceSecuritySettingsService settings;
    private final SecurityAuditLogService auditLog;
    private final ConditionalAccessPolicyRepository policies;
    private final PentestEngagementRepository pentests;
    private final ObjectMapper json = new ObjectMapper();

    public ComplianceEvidenceService(ComplianceEvidenceBundleRepository bundles,
                                     WorkspaceSecuritySettingsService settings,
                                     SecurityAuditLogService auditLog,
                                     ConditionalAccessPolicyRepository policies,
                                     PentestEngagementRepository pentests) {
        this.bundles = bundles;
        this.settings = settings;
        this.auditLog = auditLog;
        this.policies = policies;
        this.pentests = pentests;
    }

    public List<ComplianceEvidenceBundle> list(String workspaceId) {
        return bundles.findByWorkspaceIdOrderByGeneratedAtDesc(workspaceId);
    }

    public ComplianceEvidenceBundle generate(String workspaceId, String actorId, String framework,
                                             LocalDate periodStart, LocalDate periodEnd) {
        String fw = framework == null ? "" : framework.trim().toUpperCase();
        if (!FRAMEWORKS.contains(fw)) {
            throw ApiException.badRequest("INVALID_FRAMEWORK",
                    "Framework must be SOC2_TYPE2 or ISO_27001.");
        }
        WorkspaceSecuritySettings sec = settings.get(workspaceId);
        AuditHashChain.Result chain = auditLog.verify(workspaceId);

        Map<String, Object> controls = new LinkedHashMap<>();
        controls.put("auditTrailImmutable", chain.intact());
        controls.put("auditEntriesVerified", chain.verifiedCount());
        controls.put("encryptionAtRest", sec.getEncryptionAlgorithm());
        controls.put("customerManagedKeys", sec.isByokEnabled());
        controls.put("dataResidency", sec.getDataResidencyRegion());
        controls.put("conditionalAccessPolicies", policies.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId).size());
        controls.put("anomalyDetection", sec.isAnomalyDetectionEnabled());
        controls.put("auditRetentionDays", sec.getAuditRetentionDays());
        controls.put("pentestEngagements", pentests.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).size());
        controls.put("mfaAvailable", true);
        controls.put("phishingResistantAuth", true);

        ComplianceEvidenceBundle b = new ComplianceEvidenceBundle();
        b.setId("EVB-" + UUID.randomUUID().toString().substring(0, 12));
        b.setWorkspaceId(workspaceId);
        b.setFramework(fw);
        // The bundle is "built" synchronously here; the UI still shows Building → Ready so the
        // status model matches the spec's one-click flow.
        b.setStatus("READY");
        b.setPeriodStart(periodStart);
        b.setPeriodEnd(periodEnd);
        b.setSummary(toJson(controls));
        b.setGeneratedBy(actorId);
        b.setGeneratedAt(OffsetDateTime.now());
        ComplianceEvidenceBundle saved = bundles.save(b);

        auditLog.record(workspaceId, actorId, "EVIDENCE_BUNDLE_GENERATED", "compliance", saved.getId(),
                fw + " evidence bundle generated");
        return saved;
    }

    public ComplianceEvidenceBundle markDownloaded(String workspaceId, String actorId, String id) {
        ComplianceEvidenceBundle b = scoped(workspaceId, id);
        b.setStatus("DOWNLOADED");
        b.setDownloadedAt(OffsetDateTime.now());
        ComplianceEvidenceBundle saved = bundles.save(b);
        auditLog.record(workspaceId, actorId, "EVIDENCE_BUNDLE_DOWNLOADED", "compliance", id,
                b.getFramework() + " evidence bundle downloaded");
        return saved;
    }

    private String toJson(Map<String, Object> data) {
        try {
            return json.writeValueAsString(data);
        } catch (Exception e) {
            return "{}";
        }
    }

    private ComplianceEvidenceBundle scoped(String workspaceId, String id) {
        ComplianceEvidenceBundle b = bundles.findById(id)
                .orElseThrow(() -> ApiException.notFound("Evidence bundle", id));
        if (!b.getWorkspaceId().equals(workspaceId)) {
            throw ApiException.notFound("Evidence bundle", id);
        }
        return b;
    }
}
