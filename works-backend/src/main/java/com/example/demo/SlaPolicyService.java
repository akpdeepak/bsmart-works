package com.example.demo;

import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Pure field-level helpers for the SLA engine — id generation, defaults, normalization, and update
 * copying for policies, calendars, targets, and escalations. No I/O, so it is unit-testable in
 * isolation (mirrors {@link ComplianceRuleService}). RBAC, persistence, events, and BQL validation
 * live in the controller/service boundary.
 */
@Service
public class SlaPolicyService {

    static final String DEFAULT_TIMEZONE = "Asia/Kolkata";

    private static String json(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    // ── Policies ───────────────────────────────────────────────────────────────

    /** Stamp a new policy with id, creator, defaults, and timestamps; starts inactive. */
    public SlaPolicy prepareNew(SlaPolicy policy, String creatorId) {
        policy.setId("SLP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        policy.setCreatedBy(creatorId);
        policy.setScopeBql(policy.getScopeBql() == null ? "" : policy.getScopeBql().trim());
        policy.setActive(false); // test-before-activate
        OffsetDateTime now = OffsetDateTime.now();
        policy.setCreatedAt(now);
        policy.setUpdatedAt(now);
        return policy;
    }

    /** Copy editable policy fields from {@code updated} onto {@code existing} and bump updatedAt. */
    public SlaPolicy applyUpdate(SlaPolicy existing, SlaPolicy updated) {
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        if (updated.getScopeBql() != null) {
            existing.setScopeBql(updated.getScopeBql().trim());
        }
        // calendarId / customerTier are nullable by design (null = 24x7 / internal); copy as-is.
        existing.setCalendarId(updated.getCalendarId());
        existing.setCustomerTier(updated.getCustomerTier());
        existing.setUpdatedAt(OffsetDateTime.now());
        return existing;
    }

    // ── Calendars ──────────────────────────────────────────────────────────────

    /** Stamp a new calendar with id, creator, normalized JSON defaults, and timestamps. */
    public SlaCalendar prepareCalendar(SlaCalendar cal, String creatorId) {
        cal.setId("SLC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        cal.setCreatedBy(creatorId);
        if (cal.getTimezone() == null || cal.getTimezone().isBlank()) {
            cal.setTimezone(DEFAULT_TIMEZONE);
        }
        cal.setWorkWeek(json(cal.getWorkWeek(), "{}"));
        cal.setHolidays(json(cal.getHolidays(), "[]"));
        OffsetDateTime now = OffsetDateTime.now();
        cal.setCreatedAt(now);
        cal.setUpdatedAt(now);
        return cal;
    }

    /** Copy editable calendar fields from {@code updated} onto {@code existing} and bump updatedAt. */
    public SlaCalendar applyCalendarUpdate(SlaCalendar existing, SlaCalendar updated) {
        existing.setName(updated.getName());
        if (updated.getTimezone() != null && !updated.getTimezone().isBlank()) {
            existing.setTimezone(updated.getTimezone());
        }
        if (updated.getWorkWeek() != null) {
            existing.setWorkWeek(json(updated.getWorkWeek(), "{}"));
        }
        if (updated.getHolidays() != null) {
            existing.setHolidays(json(updated.getHolidays(), "[]"));
        }
        existing.setUpdatedAt(OffsetDateTime.now());
        return existing;
    }

    // ── Targets ────────────────────────────────────────────────────────────────

    /** Stamp a target with id, owning policy, denormalized workspace, and normalized defaults. */
    public SlaTarget prepareTarget(SlaTarget target, String policyId, String workspaceId) {
        target.setId("SLT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        target.setPolicyId(policyId);
        target.setWorkspaceId(workspaceId);
        target.setMetric(target.getMetric() == null ? "RESOLUTION" : target.getMetric().trim().toUpperCase());
        target.setPauseStatuses(json(target.getPauseStatuses(), "[]"));
        if (target.getSortOrder() == null) {
            target.setSortOrder(0);
        }
        return target;
    }

    // ── Escalations ────────────────────────────────────────────────────────────

    /** Stamp an escalation step with id, owning policy, denormalized workspace, and defaults. */
    public SlaEscalation prepareEscalation(SlaEscalation esc, String policyId, String workspaceId) {
        esc.setId("SLE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        esc.setPolicyId(policyId);
        esc.setWorkspaceId(workspaceId);
        esc.setAction(esc.getAction() == null ? "NOTIFY" : esc.getAction().trim().toUpperCase());
        esc.setActionTarget(json(esc.getActionTarget(), "[]"));
        esc.setOnBreach(esc.getOnBreach() != null && esc.getOnBreach());
        if (esc.getSortOrder() == null) {
            esc.setSortOrder(0);
        }
        return esc;
    }
}
