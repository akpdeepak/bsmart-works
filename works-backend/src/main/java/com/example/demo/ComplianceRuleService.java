package com.example.demo;

import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * Pure field-level helpers for compliance rules — id generation, defaults, severity
 * normalization, and update copying. No I/O, so it is unit-testable in isolation
 * (mirrors {@link ReportService}). RBAC, persistence, events and BQL dry-run
 * orchestration live in the controller layer (a later PR).
 */
@Service
public class ComplianceRuleService {

    static final Set<String> SEVERITIES = Set.of("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO");
    static final String DEFAULT_SEVERITY = "MEDIUM";

    /** Coerce a free-text severity to a known value; unknown/blank falls back to MEDIUM. */
    public String normalizeSeverity(String severity) {
        if (severity == null) {
            return DEFAULT_SEVERITY;
        }
        String s = severity.trim().toUpperCase();
        return SEVERITIES.contains(s) ? s : DEFAULT_SEVERITY;
    }

    /** notify_to defaults to an empty JSON array when absent. */
    public String normalizeNotifyTo(String notifyTo) {
        return notifyTo == null || notifyTo.isBlank() ? "[]" : notifyTo;
    }

    /** Stamp a new rule with id, creator, normalized defaults and timestamps; starts inactive. */
    public ComplianceRule prepareNew(ComplianceRule rule, String creatorId) {
        rule.setId("CR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        rule.setCreatedBy(creatorId);
        rule.setScopeBql(rule.getScopeBql() == null ? "" : rule.getScopeBql().trim());
        rule.setSeverity(normalizeSeverity(rule.getSeverity()));
        rule.setNotifyTo(normalizeNotifyTo(rule.getNotifyTo()));
        rule.setActive(false); // test-before-activate: a new rule is never live on creation
        rule.setIsTemplate(rule.getIsTemplate() != null && rule.getIsTemplate());
        OffsetDateTime now = OffsetDateTime.now();
        rule.setCreatedAt(now);
        rule.setUpdatedAt(now);
        return rule;
    }

    /** Copy the editable fields from {@code updated} onto {@code existing} and bump updatedAt. */
    public ComplianceRule applyUpdate(ComplianceRule existing, ComplianceRule updated) {
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        if (updated.getProjectId() != null) {
            existing.setProjectId(updated.getProjectId());
        }
        if (updated.getScopeBql() != null) {
            existing.setScopeBql(updated.getScopeBql().trim());
        }
        if (updated.getAssertionBql() != null) {
            existing.setAssertionBql(updated.getAssertionBql());
        }
        if (updated.getSeverity() != null) {
            existing.setSeverity(normalizeSeverity(updated.getSeverity()));
        }
        if (updated.getNotifyTo() != null) {
            existing.setNotifyTo(normalizeNotifyTo(updated.getNotifyTo()));
        }
        existing.setUpdatedAt(OffsetDateTime.now());
        return existing;
    }
}
