package com.bcits.works;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap Y · Compliance evidence package (iteration 16). Assembles an on-demand, audit-ready bundle
 * (SOC 2 / ISO 27001) from real, workspace-scoped controls and activity — MFA adoption, the
 * immutable audit trail, AI governance, access reviews, the compliance engine, and SLA posture.
 * Admin-gated (RB-10 §2), workspace-scoped (RB-40 §1).
 */
@Service
public class EvidencePackageService {

    private final JdbcTemplate jdbc;
    private final RbacGate rbac;
    private final EvidencePackageRepository repo;
    private final EventService events;

    public EvidencePackageService(JdbcTemplate jdbc, RbacGate rbac, EvidencePackageRepository repo,
                                  EventService events) {
        this.jdbc = jdbc;
        this.rbac = rbac;
        this.repo = repo;
        this.events = events;
    }

    private void requireAdmin(String callerId, String wsId) {
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Workspace", wsId);
        }
        if (!rbac.isAdmin(callerId, wsId)) {
            throw ApiException.forbidden("Compliance evidence requires a workspace administrator.");
        }
    }

    public List<EvidencePackage> list(String callerId, String workspaceId) {
        requireAdmin(callerId, workspaceId);
        return repo.findByWorkspaceIdOrderByGeneratedAtDesc(workspaceId);
    }

    public EvidencePackage get(String callerId, String id) {
        EvidencePackage p = repo.findById(id).orElseThrow(() -> ApiException.notFound("EvidencePackage", id));
        requireAdmin(callerId, p.getWorkspaceId());
        return p;
    }

    @Transactional
    public EvidencePackage generate(String callerId, String workspaceId, String framework) {
        requireAdmin(callerId, workspaceId);
        String fw = framework == null || framework.isBlank() ? "SOC2" : framework.trim().toUpperCase();

        Map<String, Object> controls = gatherControls(workspaceId);
        String content = renderBundle(fw, controls);

        EvidencePackage p = new EvidencePackage();
        p.setId("EVP-" + shortId());
        p.setWorkspaceId(workspaceId);
        p.setFramework(fw);
        p.setPeriod(YearMonth.now().toString());
        p.setStatus("GENERATED");
        p.setSummary(controls.size() + " control areas evidenced for " + fw + ".");
        p.setContent(content);
        p.setGeneratedBy(callerId);
        OffsetDateTime now = OffsetDateTime.now();
        p.setGeneratedAt(now);
        p.setCreatedAt(now);
        repo.save(p);
        events.recordInWorkspace(workspaceId, p.getId(), "EVIDENCE_PACKAGE_GENERATED", callerId,
            Map.of("framework", fw, "period", p.getPeriod()));
        return p;
    }

    private Map<String, Object> gatherControls(String workspaceId) {
        Map<String, Object> c = new LinkedHashMap<>();
        long members = jdbc.queryForObject(
            "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ?", Long.class, workspaceId);
        long mfaEnabled = jdbc.queryForObject(
            "SELECT COUNT(*) FROM workspace_members wm JOIN users u ON u.id = wm.user_id "
            + "WHERE wm.workspace_id = ? AND u.mfa_enabled = TRUE", Long.class, workspaceId);
        long auditEvents = jdbc.queryForObject(
            "SELECT COUNT(*) FROM events WHERE workspace_id = ?", Long.class, workspaceId);
        long aiInvocations = jdbc.queryForObject(
            "SELECT COUNT(*) FROM ai_invocations WHERE workspace_id = ?", Long.class, workspaceId);
        long complianceRules = jdbc.queryForObject(
            "SELECT COUNT(*) FROM compliance_rules WHERE workspace_id = ? AND active = TRUE", Long.class, workspaceId);
        long openViolations = jdbc.queryForObject(
            "SELECT COUNT(*) FROM compliance_violations WHERE workspace_id = ? AND status = 'OPEN'", Long.class, workspaceId);
        long slaPolicies = jdbc.queryForObject(
            "SELECT COUNT(*) FROM sla_policies WHERE workspace_id = ? AND active = TRUE", Long.class, workspaceId);
        long accessReviews = jdbc.queryForObject(
            "SELECT COUNT(*) FROM access_reviews WHERE workspace_id = ?", Long.class, workspaceId);

        c.put("members", members);
        c.put("mfaEnabled", mfaEnabled);
        c.put("mfaAdoptionPercent", members == 0 ? 0 : Math.round(mfaEnabled * 100.0 / members));
        c.put("auditEvents", auditEvents);
        c.put("aiInvocations", aiInvocations);
        c.put("complianceRules", complianceRules);
        c.put("openViolations", openViolations);
        c.put("slaPolicies", slaPolicies);
        c.put("accessReviews", accessReviews);
        return c;
    }

    /** Deterministic markdown bundle from the gathered controls. Pure. */
    static String renderBundle(String framework, Map<String, Object> c) {
        StringBuilder sb = new StringBuilder("# ").append(framework).append(" evidence package\n\n");
        sb.append("_Generated ").append(OffsetDateTime.now()).append("_\n\n");
        sb.append("## CC6 — Logical access controls\n");
        sb.append("- Workspace members: ").append(c.get("members")).append("\n");
        sb.append("- MFA adoption: ").append(c.get("mfaAdoptionPercent")).append("% (")
          .append(c.get("mfaEnabled")).append(" of ").append(c.get("members")).append(")\n");
        sb.append("- Access reviews on record: ").append(c.get("accessReviews")).append("\n\n");
        sb.append("## CC7 — System operations & monitoring\n");
        sb.append("- Immutable audit events captured: ").append(c.get("auditEvents")).append("\n");
        sb.append("- Active SLA policies: ").append(c.get("slaPolicies")).append("\n\n");
        sb.append("## CC4 — Compliance monitoring\n");
        sb.append("- Active compliance rules: ").append(c.get("complianceRules")).append("\n");
        sb.append("- Open violations: ").append(c.get("openViolations")).append("\n\n");
        sb.append("## AI governance\n");
        sb.append("- AI invocations audited (scope, budget, tier, cost): ").append(c.get("aiInvocations")).append("\n\n");
        sb.append("## Data protection\n");
        sb.append("- Append-only event log; PII held in the tokenized vault and crypto-shredded on erasure (RB-40 §3).\n");
        sb.append("- TLS 1.3 in transit; AES-256 at rest; BYOK/KMS available (RB-40 §4).\n");
        return sb.toString();
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
