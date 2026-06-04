package com.example.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Escalation policies (iteration 7, Cap K): "if not acknowledged in X hours, escalate to Y." Every
 * 15 minutes this sweeps OPEN, un-escalated violations and, for any whose rule defines an escalation
 * window that has now elapsed, routes the rule's {@code escalateTo} targets
 * ({@link ComplianceNotificationService}), marks the violation escalated, and records an event
 * (RB-10 §3). Acknowledged violations never escalate — acknowledging is the human handshake that
 * stops the clock.
 */
@Component
public class ComplianceEscalationScheduler {

    private static final Logger log = LoggerFactory.getLogger(ComplianceEscalationScheduler.class);

    private final ComplianceViolationRepository violations;
    private final ComplianceRuleRepository rules;
    private final ComplianceViolationService lifecycle;
    private final ComplianceNotificationService notifier;
    private final EventService eventService;

    public ComplianceEscalationScheduler(ComplianceViolationRepository violations,
                                         ComplianceRuleRepository rules, ComplianceViolationService lifecycle,
                                         ComplianceNotificationService notifier, EventService eventService) {
        this.violations = violations;
        this.rules = rules;
        this.lifecycle = lifecycle;
        this.notifier = notifier;
        this.eventService = eventService;
    }

    @Scheduled(cron = "0 */15 * * * *")
    public void escalateOverdue() {
        List<ComplianceViolation> open = violations.findByStatusAndEscalatedFalse("OPEN");
        if (open.isEmpty()) return;
        OffsetDateTime now = OffsetDateTime.now();
        int escalated = 0;
        for (ComplianceViolation v : open) {
            ComplianceRule rule = rules.findById(v.getRuleId()).orElse(null);
            if (rule == null) continue;
            if (!lifecycle.isEscalationDue(v, rule.getEscalateAfterHours(), now)) continue;
            try {
                notifier.routeEscalation(rule, v);
            } catch (RuntimeException ex) {
                log.warn("[COMPLIANCE] Escalation routing failed for {}: {}", v.getId(), ex.getMessage());
            }
            v.setEscalated(true);
            v.setEscalatedAt(now);
            v.setUpdatedAt(now);
            violations.save(v);
            eventService.record(v.getId(), "COMPLIANCE_VIOLATION_ESCALATED", "system",
                Map.of("ruleId", v.getRuleId(), "workItemId", v.getWorkItemId() == null ? "" : v.getWorkItemId()));
            escalated++;
        }
        if (escalated > 0) {
            log.info("[COMPLIANCE] Escalated {} overdue violation(s)", escalated);
        }
    }
}
