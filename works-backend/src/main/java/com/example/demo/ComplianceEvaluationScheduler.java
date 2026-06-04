package com.example.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Drives continuous rule evaluation (iteration 7, Cap K). The spec distinguishes <i>continuous</i>
 * rules (re-checked as work changes) from <i>scheduled</i> rules (periodic). With the platform on
 * an in-process backbone (no broker yet, ADR-0001), "continuous" is realised as a short-interval
 * sweep of active CONTINUOUS rules; SCHEDULED rules sweep hourly. Each rule is evaluated defensively
 * by {@link ComplianceEvaluationService} (a bad rule is skipped, never aborts the batch). On-demand
 * evaluation is also exposed via the rule controller's {@code /evaluate} endpoint.
 */
@Component
public class ComplianceEvaluationScheduler {

    private static final Logger log = LoggerFactory.getLogger(ComplianceEvaluationScheduler.class);

    private final ComplianceRuleRepository rules;
    private final ComplianceEvaluationService evaluation;

    public ComplianceEvaluationScheduler(ComplianceRuleRepository rules,
                                         ComplianceEvaluationService evaluation) {
        this.rules = rules;
        this.evaluation = evaluation;
    }

    /** Continuous rules: sweep every 2 minutes. */
    @Scheduled(cron = "0 */2 * * * *")
    public void evaluateContinuous() {
        sweep("CONTINUOUS");
    }

    /** Scheduled rules: sweep at the top of every hour. */
    @Scheduled(cron = "0 0 * * * *")
    public void evaluateScheduled() {
        sweep("SCHEDULED");
    }

    private void sweep(String mode) {
        List<ComplianceRule> active = rules.findByActiveTrueAndEvaluationMode(mode);
        if (active.isEmpty()) return;
        int opened = 0;
        int resolved = 0;
        for (ComplianceRule rule : active) {
            ComplianceEvaluationService.EvaluationResult r = evaluation.evaluateRule(rule);
            opened += r.opened();
            resolved += r.resolved();
        }
        if (opened > 0 || resolved > 0) {
            log.info("[COMPLIANCE] {} sweep over {} rule(s): {} opened, {} resolved",
                mode, active.size(), opened, resolved);
        }
    }
}
