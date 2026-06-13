package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Cap V · Hourly trigger for the impediment SLA-breach sweep. Thin by design (like
 * {@code SlaClockScheduler}); all logic — detection, dedupe, recipient resolution and
 * notification — lives in {@link ImpedimentSlaService#sweep()}, which is unit-tested
 * without the scheduling wrapper. @EnableScheduling is already on (WorksApplication).
 */
@Component
public class ImpedimentSlaScheduler {

    private static final Logger log = LoggerFactory.getLogger(ImpedimentSlaScheduler.class);

    private final ImpedimentSlaService service;

    public ImpedimentSlaScheduler(ImpedimentSlaService service) {
        this.service = service;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void tick() {
        try {
            service.sweep();
        } catch (RuntimeException ex) {
            log.warn("[IMPEDIMENT-SLA] Sweep failed", ex);
        }
    }
}
