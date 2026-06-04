package com.example.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Continuous SLA evaluation (iteration 8, Cap M — escalation + breach detection). Polls
 * every minute, recomputing live business-time on running clocks, firing escalation steps as
 * thresholds are crossed, and marking breaches. The arithmetic and persistence live in
 * {@link SlaEngineService#evaluateActiveClocks()}; this is only the cron trigger (mirrors
 * {@link ReportDeliveryScheduler}). Scheduling is enabled in {@link DemoApplication}.
 */
@Component
public class SlaEvaluationScheduler {

    private static final Logger log = LoggerFactory.getLogger(SlaEvaluationScheduler.class);

    private final SlaEngineService engine;

    public SlaEvaluationScheduler(SlaEngineService engine) {
        this.engine = engine;
    }

    @Scheduled(fixedDelayString = "${sla.evaluation.interval-ms:60000}")
    public void evaluate() {
        try {
            int actions = engine.evaluateActiveClocks();
            if (actions > 0) {
                log.info("SLA evaluation cycle applied {} escalation/breach action(s)", actions);
            }
        } catch (Exception e) {
            // A single bad cycle must never kill the scheduler thread.
            log.error("SLA evaluation cycle failed: {}", e.toString());
        }
    }
}
