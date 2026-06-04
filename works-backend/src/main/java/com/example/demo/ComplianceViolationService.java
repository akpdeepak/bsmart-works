package com.example.demo;

import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.Set;

/**
 * Pure lifecycle transitions for compliance violations (iteration 7, Cap K). No I/O, so it is
 * unit-testable in isolation (mirrors {@link ComplianceRuleService}). Persistence, RBAC and event
 * recording live in the controller. Lifecycle:
 * <pre>
 *   OPEN ──acknowledge──▶ ACKNOWLEDGED ──resolve──▶ RESOLVED
 *     └────────────────resolve / wontFix───────────▶ RESOLVED / WONT_FIX
 * </pre>
 * Terminal states (RESOLVED, WONT_FIX) cannot transition again — a closed violation is history.
 */
@Service
public class ComplianceViolationService {

    static final Set<String> TERMINAL = Set.of("RESOLVED", "WONT_FIX");

    /** True if a violation can still change state (not already closed). */
    public boolean isOpen(ComplianceViolation v) {
        return v != null && !TERMINAL.contains(v.getStatus());
    }

    /**
     * True if an OPEN, un-escalated violation has aged past the rule's escalation window.
     * Acknowledged/closed violations never escalate — acknowledging is the human "I've got it".
     */
    public boolean isEscalationDue(ComplianceViolation v, Integer afterHours, java.time.OffsetDateTime now) {
        if (v == null || afterHours == null || afterHours <= 0) return false;
        if (!"OPEN".equals(v.getStatus())) return false;
        if (Boolean.TRUE.equals(v.getEscalated())) return false;
        if (v.getDetectedAt() == null) return false;
        return v.getDetectedAt().plusHours(afterHours).isBefore(now);
    }

    /** Move OPEN → ACKNOWLEDGED. No-op fields if already acknowledged; rejects terminal states. */
    public ComplianceViolation acknowledge(ComplianceViolation v, String userId) {
        requireOpen(v);
        v.setStatus("ACKNOWLEDGED");
        v.setAcknowledgedBy(userId);
        v.setAcknowledgedAt(OffsetDateTime.now());
        v.setUpdatedAt(OffsetDateTime.now());
        return v;
    }

    /** Close a violation as RESOLVED (manual resolution). */
    public ComplianceViolation resolve(ComplianceViolation v, String userId, String note) {
        requireOpen(v);
        close(v, "RESOLVED", "MANUAL", userId, note);
        return v;
    }

    /** Close a violation as WONT_FIX (accepted deviation). */
    public ComplianceViolation wontFix(ComplianceViolation v, String userId, String note) {
        requireOpen(v);
        close(v, "WONT_FIX", "WONT_FIX", userId, note);
        return v;
    }

    private void close(ComplianceViolation v, String status, String resolution, String userId, String note) {
        OffsetDateTime now = OffsetDateTime.now();
        v.setStatus(status);
        v.setResolution(resolution);
        v.setResolvedBy(userId);
        v.setResolvedAt(now);
        if (note != null && !note.isBlank()) v.setNote(note);
        v.setUpdatedAt(now);
    }

    private void requireOpen(ComplianceViolation v) {
        if (!isOpen(v)) {
            throw ApiException.badRequest("VIOLATION_CLOSED",
                "This violation is already closed and cannot change state.");
        }
    }
}
