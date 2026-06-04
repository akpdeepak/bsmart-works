package com.example.demo;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Pure field-level helpers for SLA policies, targets and instances — id generation,
 * defaults, metric normalization, update copying, and the consumed/remaining maths for a
 * running clock. No I/O, so it is unit-testable in isolation (mirrors {@link ComplianceRuleService}).
 * RBAC, persistence, events and business-hours arithmetic live in the orchestration
 * services ({@link SlaConfigService}, {@link SlaEngineService}).
 */
@Service
public class SlaPolicyService {

    static final Set<String> METRICS = Set.of("FIRST_RESPONSE", "RESOLUTION", "CUSTOM");
    static final String DEFAULT_METRIC = "RESOLUTION";
    static final Set<String> ACTIONS = Set.of("NOTIFY", "REASSIGN");

    /** Coerce a free-text metric to a known value; unknown/blank falls back to RESOLUTION. */
    public String normalizeMetric(String metric) {
        if (metric == null) {
            return DEFAULT_METRIC;
        }
        String m = metric.trim().toUpperCase().replace(' ', '_');
        return METRICS.contains(m) ? m : DEFAULT_METRIC;
    }

    /** Escalation action normalization; unknown/blank falls back to NOTIFY. */
    public String normalizeAction(String action) {
        if (action == null) {
            return "NOTIFY";
        }
        String a = action.trim().toUpperCase();
        return ACTIONS.contains(a) ? a : "NOTIFY";
    }

    /** A JSON-ish field defaults to an empty array when absent/blank. */
    public String normalizeJsonArray(String value) {
        return value == null || value.isBlank() ? "[]" : value;
    }

    /** Clamp an escalation threshold to the 1–100 range; null/blank → 80. */
    public int normalizeThreshold(Integer pct) {
        if (pct == null) {
            return 80;
        }
        return Math.max(1, Math.min(100, pct));
    }

    /** Split a comma-separated stop-status list into trimmed, non-blank statuses. */
    public List<String> parseStopStatuses(String stopStatus) {
        List<String> out = new ArrayList<>();
        if (stopStatus == null) {
            return out;
        }
        for (String s : stopStatus.split(",")) {
            String t = s.trim();
            if (!t.isEmpty()) {
                out.add(t);
            }
        }
        return out;
    }

    /** Stamp a new policy with id, creator, normalized defaults and timestamps; starts inactive. */
    public SlaPolicy prepareNew(SlaPolicy policy, String creatorId) {
        policy.setId("SLA-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        policy.setCreatedBy(creatorId);
        policy.setScopeBql(policy.getScopeBql() == null ? "" : policy.getScopeBql().trim());
        policy.setPauseStatuses(normalizeJsonArray(policy.getPauseStatuses()));
        policy.setActive(false); // test-before-activate: a new policy is never live on creation
        policy.setIsTemplate(policy.getIsTemplate() != null && policy.getIsTemplate());
        OffsetDateTime now = OffsetDateTime.now();
        policy.setCreatedAt(now);
        policy.setUpdatedAt(now);
        return policy;
    }

    /** Copy the editable fields from {@code updated} onto {@code existing} and bump updatedAt. */
    public SlaPolicy applyUpdate(SlaPolicy existing, SlaPolicy updated) {
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        if (updated.getProjectId() != null) {
            existing.setProjectId(updated.getProjectId());
        }
        if (updated.getScopeBql() != null) {
            existing.setScopeBql(updated.getScopeBql().trim());
        }
        if (updated.getCalendarId() != null) {
            existing.setCalendarId(updated.getCalendarId());
        }
        if (updated.getPauseStatuses() != null) {
            existing.setPauseStatuses(normalizeJsonArray(updated.getPauseStatuses()));
        }
        existing.setUpdatedAt(OffsetDateTime.now());
        return existing;
    }

    /** Stamp a new target with id, normalized metric, and a sane minimum target. */
    public SlaTarget prepareTarget(SlaTarget target, String policyId, String workspaceId) {
        target.setId("SLT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        target.setPolicyId(policyId);
        target.setWorkspaceId(workspaceId);
        target.setMetric(normalizeMetric(target.getMetric()));
        if (target.getTargetMinutes() == null || target.getTargetMinutes() < 1) {
            target.setTargetMinutes(60);
        }
        if (target.getStopStatus() == null || target.getStopStatus().isBlank()) {
            target.setStopStatus("Done");
        }
        if (target.getSortOrder() == null) {
            target.setSortOrder(0);
        }
        return target;
    }

    /** Stamp a new escalation with id and normalized action/threshold. */
    public SlaEscalation prepareEscalation(SlaEscalation esc, String policyId, String workspaceId) {
        esc.setId("SLE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        esc.setPolicyId(policyId);
        esc.setWorkspaceId(workspaceId);
        esc.setAction(normalizeAction(esc.getAction()));
        esc.setThresholdPct(normalizeThreshold(esc.getThresholdPct()));
        esc.setNotifyTo(normalizeJsonArray(esc.getNotifyTo()));
        if (esc.getSortOrder() == null) {
            esc.setSortOrder(0);
        }
        return esc;
    }

    // ── Running-clock maths ───────────────────────────────────────────────────

    /**
     * Total business-seconds consumed by an instance as of {@code elapsedWhileRunning}
     * (the business-seconds since {@code runningSince}, computed by the caller via the
     * {@link BusinessHoursCalculator}). Frozen {@code consumedSeconds} plus live elapsed.
     */
    public long totalConsumed(SlaInstance inst, long elapsedWhileRunning) {
        long frozen = inst.getConsumedSeconds() == null ? 0 : inst.getConsumedSeconds();
        boolean running = "RUNNING".equals(inst.getStatus());
        return frozen + (running ? Math.max(0, elapsedWhileRunning) : 0);
    }

    /** Whole-percent of the target consumed (0–100+, capped at 999 to stay sane). */
    public int consumedPercent(SlaInstance inst, long totalConsumedSeconds) {
        long targetSeconds = (long) (inst.getTargetMinutes() == null ? 0 : inst.getTargetMinutes()) * 60;
        if (targetSeconds <= 0) {
            return 100;
        }
        long pct = totalConsumedSeconds * 100 / targetSeconds;
        return (int) Math.min(999, pct);
    }
}
