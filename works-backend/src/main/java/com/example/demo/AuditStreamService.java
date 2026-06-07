package com.example.demo;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Streaming the audit log to an external SIEM — Splunk, Datadog, ELK, or a generic webhook
 * (iteration 19 Cap T). Workspace-scoped (RB-40 §1); the controller applies RBAC
 * ({@code manage_security}). Delivery here renders the batch (JSON or ArcSight CEF) and advances
 * the high-water mark; the actual outbound HTTP send rides the existing signed-webhook delivery
 * path (iteration 13) when wired in production — kept out of this class so unit runs stay offline.
 */
@Service
public class AuditStreamService {

    private static final Set<String> PROVIDERS = Set.of("SPLUNK", "DATADOG", "ELK", "WEBHOOK");
    private static final Set<String> FORMATS = Set.of("JSON", "CEF");

    private final AuditLogStreamConfigRepository repo;
    private final AuditLogEntryRepository entries;
    private final AuditLogService auditLog;

    public AuditStreamService(AuditLogStreamConfigRepository repo, AuditLogEntryRepository entries,
                              AuditLogService auditLog) {
        this.repo = repo;
        this.entries = entries;
        this.auditLog = auditLog;
    }

    public List<AuditLogStreamConfig> list(String workspaceId) {
        return repo.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId);
    }

    public AuditLogStreamConfig create(String workspaceId, String actorId, AuditLogStreamConfig in) {
        String provider = upper(in.getProvider());
        if (!PROVIDERS.contains(provider)) {
            throw ApiException.badRequest("INVALID_PROVIDER", "Provider must be one of " + PROVIDERS + ".");
        }
        String format = in.getFormat() == null ? "JSON" : upper(in.getFormat());
        if (!FORMATS.contains(format)) {
            throw ApiException.badRequest("INVALID_FORMAT", "Format must be JSON or CEF.");
        }
        if (in.getEndpointUrl() == null || in.getEndpointUrl().isBlank()) {
            throw ApiException.badRequest("INVALID_ENDPOINT", "An endpoint URL is required.");
        }
        AuditLogStreamConfig c = new AuditLogStreamConfig();
        c.setId("SIEM-" + UUID.randomUUID().toString().substring(0, 10));
        c.setWorkspaceId(workspaceId);
        c.setProvider(provider);
        c.setFormat(format);
        c.setEndpointUrl(in.getEndpointUrl().trim());
        c.setAuthHeader(in.getAuthHeader());
        c.setEnabled(in.isEnabled());
        c.setCreatedBy(actorId);
        c.setCreatedAt(OffsetDateTime.now());
        AuditLogStreamConfig saved = repo.save(c);
        auditLog.record(workspaceId, actorId, "AUDIT_STREAM_CONFIGURED", "siem", saved.getProvider(),
                "Streaming to " + saved.getProvider());
        return saved;
    }

    public void delete(String workspaceId, String actorId, String id) {
        AuditLogStreamConfig c = scoped(workspaceId, id);
        repo.delete(c);
        auditLog.record(workspaceId, actorId, "AUDIT_STREAM_REMOVED", "siem", c.getProvider(),
                "Stopped streaming to " + c.getProvider());
    }

    /**
     * Render and "deliver" all audit entries newer than the config's high-water mark, advancing it.
     * Returns the rendered batch so the caller / a future delivery worker can ship it. A no-op for a
     * disabled config.
     */
    public List<String> drain(String workspaceId, String id) {
        AuditLogStreamConfig c = scoped(workspaceId, id);
        if (!c.isEnabled()) {
            return List.of();
        }
        List<AuditLogEntry> pending = entries
                .findByWorkspaceIdAndSeqGreaterThanOrderBySeqAsc(workspaceId, c.getLastStreamedSeq());
        List<String> rendered = pending.stream()
                .map(e -> "CEF".equals(c.getFormat()) ? toCef(e) : toJson(e))
                .collect(Collectors.toList());
        if (!pending.isEmpty()) {
            c.setLastStreamedSeq(pending.get(pending.size() - 1).getSeq());
            c.setLastStreamedAt(OffsetDateTime.now());
            repo.save(c);
        }
        return rendered;
    }

    static String toJson(AuditLogEntry e) {
        return "{\"seq\":" + e.getSeq()
                + ",\"workspace\":\"" + e.getWorkspaceId() + "\""
                + ",\"actor\":\"" + e.getActorId() + "\""
                + ",\"action\":\"" + e.getAction() + "\""
                + ",\"target\":\"" + nz(e.getTargetType()) + ":" + nz(e.getTargetId()) + "\""
                + ",\"at\":\"" + e.getOccurredAt() + "\""
                + ",\"hash\":\"" + e.getEntryHash() + "\"}";
    }

    static String toCef(AuditLogEntry e) {
        // ArcSight Common Event Format: CEF:Version|Vendor|Product|Version|SignatureID|Name|Severity|Ext
        return "CEF:0|BCITS|bSmartWorks|1.0|" + e.getAction() + "|" + e.getAction() + "|3|"
                + "suser=" + e.getActorId()
                + " cs1Label=workspace cs1=" + e.getWorkspaceId()
                + " cs2Label=target cs2=" + nz(e.getTargetType()) + ":" + nz(e.getTargetId())
                + " externalId=" + e.getSeq()
                + " msg=" + (e.getDetail() == null ? "" : e.getDetail().replace('|', '/'));
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private String upper(String s) {
        return s == null ? "" : s.trim().toUpperCase();
    }

    private AuditLogStreamConfig scoped(String workspaceId, String id) {
        AuditLogStreamConfig c = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Audit stream", id));
        if (!c.getWorkspaceId().equals(workspaceId)) {
            throw ApiException.notFound("Audit stream", id);
        }
        return c;
    }
}
