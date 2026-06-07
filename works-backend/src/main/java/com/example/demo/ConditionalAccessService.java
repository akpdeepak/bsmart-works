package com.example.demo;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Conditional-access policy management + evaluation (iteration 19 Cap T, RB-40 §4). Every method is
 * workspace-scoped (RB-40 §1); the controller applies RBAC ({@code manage_security} to write,
 * {@code view_audit_log} to read). The actual decision logic is the pure
 * {@link ConditionalAccessEvaluator}; this layer filters which policies apply (by role) and
 * resolves the current local time for the time-of-day check.
 */
@Service
public class ConditionalAccessService {

    private final ConditionalAccessPolicyRepository repo;
    private final SecurityAuditLogService auditLog;

    public ConditionalAccessService(ConditionalAccessPolicyRepository repo, SecurityAuditLogService auditLog) {
        this.repo = repo;
        this.auditLog = auditLog;
    }

    public List<ConditionalAccessPolicy> list(String workspaceId) {
        return repo.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId);
    }

    public ConditionalAccessPolicy create(String workspaceId, String actorId, ConditionalAccessPolicy in) {
        validate(in);
        ConditionalAccessPolicy p = new ConditionalAccessPolicy();
        p.setId("CAP-" + UUID.randomUUID().toString().substring(0, 12));
        p.setWorkspaceId(workspaceId);
        apply(p, in);
        p.setCreatedBy(actorId);
        p.setCreatedAt(OffsetDateTime.now());
        p.setUpdatedAt(OffsetDateTime.now());
        ConditionalAccessPolicy saved = repo.save(p);
        auditLog.record(workspaceId, actorId, "CONDITIONAL_ACCESS_CREATED", "policy", saved.getId(),
                saved.getName());
        return saved;
    }

    public ConditionalAccessPolicy update(String workspaceId, String actorId, String id,
                                          ConditionalAccessPolicy in) {
        validate(in);
        ConditionalAccessPolicy p = scoped(workspaceId, id);
        apply(p, in);
        p.setUpdatedAt(OffsetDateTime.now());
        ConditionalAccessPolicy saved = repo.save(p);
        auditLog.record(workspaceId, actorId, "CONDITIONAL_ACCESS_UPDATED", "policy", id, saved.getName());
        return saved;
    }

    public void delete(String workspaceId, String actorId, String id) {
        ConditionalAccessPolicy p = scoped(workspaceId, id);
        repo.delete(p);
        auditLog.record(workspaceId, actorId, "CONDITIONAL_ACCESS_DELETED", "policy", id, p.getName());
    }

    /**
     * Evaluate the workspace's enabled policies against a live access attempt for a user in a given
     * role. Policies with a role filter apply only to that role; role-agnostic policies always apply.
     */
    public ConditionalAccessEvaluator.Decision evaluate(String workspaceId, String role, String ip,
                                                        String country, boolean deviceTrusted) {
        List<ConditionalAccessPolicy> applicable = repo.findByWorkspaceIdAndEnabledTrue(workspaceId)
                .stream()
                .filter(p -> p.getAppliesToRole() == null
                        || p.getAppliesToRole().equalsIgnoreCase(role))
                .toList();
        ConditionalAccessEvaluator.AccessContext ctx = new ConditionalAccessEvaluator.AccessContext(
                ip, country, deviceTrusted, minuteOfDay(applicable));
        return ConditionalAccessEvaluator.evaluateAll(applicable, ctx);
    }

    // The time-of-day check uses the first applicable policy's time zone (policies in one workspace
    // normally share one). Defaults to UTC when there is none.
    private int minuteOfDay(List<ConditionalAccessPolicy> policies) {
        String tz = policies.stream()
                .map(ConditionalAccessPolicy::getTimeZone)
                .filter(z -> z != null && !z.isBlank())
                .findFirst().orElse("UTC");
        ZonedDateTime now;
        try {
            now = ZonedDateTime.now(ZoneId.of(tz));
        } catch (Exception e) {
            now = ZonedDateTime.now(ZoneId.of("UTC"));
        }
        return now.getHour() * 60 + now.getMinute();
    }

    private void validate(ConditionalAccessPolicy in) {
        if (in.getName() == null || in.getName().isBlank()) {
            throw ApiException.badRequest("INVALID_POLICY", "Policy name is required.");
        }
        Integer s = in.getAllowedStartMinute();
        Integer e = in.getAllowedEndMinute();
        if ((s == null) != (e == null)) {
            throw ApiException.badRequest("INVALID_WINDOW",
                    "Provide both start and end minute for a time window, or neither.");
        }
        if (s != null && (s < 0 || s > 1439 || e < 0 || e > 1439)) {
            throw ApiException.badRequest("INVALID_WINDOW",
                    "Time-window minutes must be between 0 and 1439.");
        }
    }

    private void apply(ConditionalAccessPolicy p, ConditionalAccessPolicy in) {
        p.setName(in.getName().trim());
        p.setEnabled(in.isEnabled());
        p.setAppliesToRole(blankToNull(in.getAppliesToRole()));
        p.setIpAllowlist(in.getIpAllowlist());
        p.setGeoAllowlist(in.getGeoAllowlist());
        p.setRequireDeviceTrust(in.isRequireDeviceTrust());
        p.setTimeZone(in.getTimeZone() == null || in.getTimeZone().isBlank() ? "UTC" : in.getTimeZone());
        p.setAllowedStartMinute(in.getAllowedStartMinute());
        p.setAllowedEndMinute(in.getAllowedEndMinute());
    }

    private String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private ConditionalAccessPolicy scoped(String workspaceId, String id) {
        ConditionalAccessPolicy p = repo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Conditional access policy", id));
        if (!p.getWorkspaceId().equals(workspaceId)) {
            // Cross-tenant id — treat as not found, never reveal another workspace's data (RB-40 §1).
            throw ApiException.notFound("Conditional access policy", id);
        }
        return p;
    }
}
