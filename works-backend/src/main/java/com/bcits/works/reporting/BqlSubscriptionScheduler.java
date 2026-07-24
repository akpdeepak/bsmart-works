package com.bcits.works.reporting;

import com.bcits.works.shared.TenantScope;

import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Sweeps saved-view subscriptions hourly and delivers the ones that are due. "Due" = never delivered,
 * or last delivered longer ago than the subscription's cadence (DAILY ≥ 24h, WEEKLY ≥ 7d). The
 * actual run + audit + notification is {@link BqlSubscriptionService#deliver} — this class only
 * decides timing, so the delivery logic stays unit/integration-testable without the clock.
 */
@Component
public class BqlSubscriptionScheduler {

    private static final Logger log = LoggerFactory.getLogger(BqlSubscriptionScheduler.class);

    private final BqlSubscriptionRepository subs;
    private final BqlSubscriptionService service;

    public BqlSubscriptionScheduler(BqlSubscriptionRepository subs, BqlSubscriptionService service) {
        this.subs = subs;
        this.service = service;
    }

    @Scheduled(cron = "0 0 * * * *") // top of every hour
    public void deliverDue() {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): cross-tenant background job on a
        // scheduler thread. The OUTER iteration reads active subscriptions across ALL workspaces, so
        // the central tenant filter must be off for the all-workspace read (audited). Each individual
        // delivery is then run scoped to the subscription's OWNING workspace via runScoped, so the
        // saved BQL executes bound to the correct tenant (not unfiltered).
        TenantScope.runAsSystem(() -> {
            OffsetDateTime now = OffsetDateTime.now();
            int delivered = 0;
            for (BqlSubscription sub : subs.findByActiveTrue()) {
                if (isDue(sub, now)) {
                    TenantScope.runScoped(sub.getWorkspaceId(), () -> service.deliver(sub));
                    delivered++;
                }
            }
            if (delivered > 0) {
                log.info("[BQL-SUB] delivered {} subscription(s)", delivered);
            }
        });
    }

    /** A subscription is due if never run, or its cadence window has elapsed since the last run. */
    static boolean isDue(BqlSubscription sub, OffsetDateTime now) {
        OffsetDateTime last = sub.getLastRunAt();
        if (last == null) {
            return true;
        }
        long hours = "WEEKLY".equals(sub.getFrequency()) ? 24 * 7 : 24;
        return !last.isAfter(now.minusHours(hours));
    }
}
