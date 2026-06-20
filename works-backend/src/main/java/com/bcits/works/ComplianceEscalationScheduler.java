package com.bcits.works;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Escalation policies (iteration 7, Cap K): multi-step escalation chains.
 * Every 15 minutes this sweeps OPEN, un-fully-escalated violations.
 *
 * If the rule has {@code escalationSteps} (a JSON array of {@code {hours, targets}}), steps are
 * fired in order by tracking {@code nextEscalationStep} on each violation — the violation is
 * marked {@code escalated=true} only when every step has fired.
 *
 * If {@code escalationSteps} is empty, the scheduler falls back to the legacy single-step path
 * ({@code escalateAfterHours} + {@code escalateTo}). Acknowledged violations never escalate.
 */
@Component
public class ComplianceEscalationScheduler {

    private static final Logger log = LoggerFactory.getLogger(ComplianceEscalationScheduler.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

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
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): cross-tenant background job on a
        // scheduler thread. It reads OPEN violations across ALL workspaces and their rules; the central
        // tenant filter must be off so the all-workspace read is the explicit, audited unscoped path.
        TenantScope.runAsSystem(() -> {
            List<ComplianceViolation> open = violations.findByStatusAndEscalatedFalse("OPEN");
            if (open.isEmpty()) return;
            OffsetDateTime now = OffsetDateTime.now();
            int escalated = 0;
            for (ComplianceViolation v : open) {
                ComplianceRule rule = rules.findById(v.getRuleId()).orElse(null);
                if (rule == null) continue;
                try {
                    if (processEscalation(v, rule, now)) escalated++;
                } catch (RuntimeException ex) {
                    log.warn("[COMPLIANCE] Escalation processing failed for {}: {}", v.getId(), ex.getMessage());
                }
            }
            if (escalated > 0) {
                log.info("[COMPLIANCE] Escalated {} violation(s)", escalated);
            }
        });
    }

    private boolean processEscalation(ComplianceViolation v, ComplianceRule rule, OffsetDateTime now) {
        List<Map<String, Object>> steps = parseSteps(rule.getEscalationSteps());
        if (!steps.isEmpty()) {
            return processMultiStep(v, rule, steps, now);
        }
        // Legacy single-step path
        if (!lifecycle.isEscalationDue(v, rule.getEscalateAfterHours(), now)) return false;
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
        return true;
    }

    private boolean processMultiStep(ComplianceViolation v, ComplianceRule rule,
                                     List<Map<String, Object>> steps, OffsetDateTime now) {
        int currentStep = v.getNextEscalationStep() == null ? 0 : v.getNextEscalationStep();
        if (currentStep >= steps.size()) return false;
        Map<String, Object> step = steps.get(currentStep);
        Number hoursNum = (Number) step.get("hours");
        if (hoursNum == null || v.getDetectedAt() == null) return false;
        if (!v.getDetectedAt().plusHours(hoursNum.longValue()).isBefore(now)) return false;
        try {
            notifier.routeEscalation(rule, v);
        } catch (RuntimeException ex) {
            log.warn("[COMPLIANCE] Step {} escalation routing failed for {}: {}", currentStep, v.getId(), ex.getMessage());
        }
        int nextStep = currentStep + 1;
        v.setNextEscalationStep(nextStep);
        v.setUpdatedAt(now);
        if (nextStep >= steps.size()) {
            v.setEscalated(true);
            v.setEscalatedAt(now);
        }
        violations.save(v);
        eventService.record(v.getId(), "COMPLIANCE_VIOLATION_ESCALATED", "system",
            Map.of("ruleId", v.getRuleId(),
                   "workItemId", v.getWorkItemId() == null ? "" : v.getWorkItemId(),
                   "step", String.valueOf(currentStep)));
        return true;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseSteps(String json) {
        if (json == null || json.isBlank() || "[]".equals(json.trim())) return List.of();
        try {
            return MAPPER.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("[COMPLIANCE] Failed to parse escalation_steps JSON: {}", e.getMessage());
            return List.of();
        }
    }
}
