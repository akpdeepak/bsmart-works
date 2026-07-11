package com.bcits.works.sla;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Drives the SLA clocks (iteration 8, Cap M). With the platform on an in-process backbone (no broker
 * yet, ADR-0001), the clocks are advanced by a short-interval sweep rather than reacting to a stream:
 * every minute {@link SlaEvaluationService#sweep()} starts newly in-scope clocks, accrues business
 * time, applies pause/resume, settles MET/BREACHED, and fires escalations. A minute granularity is
 * well inside the visible-countdown UX and keeps escalation "before, not after" the breach.
 */
@Component
public class SlaClockScheduler {

    private static final Logger log = LoggerFactory.getLogger(SlaClockScheduler.class);

    private final SlaEvaluationService evaluation;

    public SlaClockScheduler(SlaEvaluationService evaluation) {
        this.evaluation = evaluation;
    }

    /** Sweep every minute (the countdown lives at minute granularity). */
    @Scheduled(cron = "0 * * * * *")
    public void tick() {
        int advanced = evaluation.sweep();
        if (advanced > 0) {
            log.info("[SLA] Clock sweep advanced {} instance(s)", advanced);
        }
    }
}
