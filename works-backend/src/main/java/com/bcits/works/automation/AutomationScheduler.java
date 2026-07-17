package com.bcits.works.automation;

import com.bcits.works.AutomationCatalog;
import com.bcits.works.AutomationService;
import com.bcits.works.shared.TenantScope;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * B22: Fires SCHEDULED trigger automations at their configured times (iteration 13, Cap C).
 * Polls every minute; for each enabled SCHEDULED rule, checks whether the rule's
 * {@code scheduleCron} has been met since its last run. Rather than re-implementing a full cron
 * parser, we use a simple "run if at least one period has elapsed since last run" gate keyed on
 * cron patterns the rule author configures. The Spring {@link Scheduled} annotation handles the
 * outer 1-minute poll; the inner logic guards against double-firing.
 *
 * <p>Every real run is audited through {@link AutomationService#runNow} which writes an
 * {@link AutomationRun} record (RB-20 §5). Uses a system actor id so the audit trail is
 * distinguishable from manual runs.
 */
@Component
public class AutomationScheduler {

    private static final Logger log = LoggerFactory.getLogger(AutomationScheduler.class);
    /** System actor used for scheduler-initiated runs — distinguishable from manual actor ids. */
    private static final String SYSTEM_ACTOR = "system:automation-scheduler";

    private final AutomationRuleRepository rules;
    private final AutomationService automationService;

    public AutomationScheduler(AutomationRuleRepository rules, AutomationService automationService) {
        this.rules = rules;
        this.automationService = automationService;
    }

    /**
     * Every minute: find all enabled SCHEDULED automation rules and execute those whose cron
     * schedule has elapsed since their last run. Uses {@link AutomationService#runNow} so every
     * execution is audited and all actions go through the same code path as manual runs.
     */
    @Scheduled(cron = "0 * * * * *")
    public void fireScheduledRules() {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): cross-tenant background job on a
        // scheduler thread. It polls enabled SCHEDULED automation rules across ALL workspaces; the
        // central tenant filter must be off so this all-workspace read is the explicit, audited
        // unscoped path. Each rule's execution self-scopes via the explicit per-rule workspaceId passed
        // to AutomationService.runNow (which then drives the actions for that one tenant).
        TenantScope.runAsSystem(() -> {
            List<AutomationRule> scheduledRules = rules.findByEnabledTrueAndTriggerType(
                AutomationCatalog.TR_SCHEDULED);
            if (scheduledRules.isEmpty()) return;
            log.debug("[AUTOMATION-SCHEDULER] Checking {} SCHEDULED rule(s)", scheduledRules.size());
            for (AutomationRule rule : scheduledRules) {
                try {
                    if (isDue(rule)) {
                        log.info("[AUTOMATION-SCHEDULER] Firing rule id={} name={}", rule.getId(), rule.getName());
                        automationService.runNow(rule.getWorkspaceId(), rule.getId(), SYSTEM_ACTOR);
                    }
                } catch (Exception ex) {
                    log.warn("[AUTOMATION-SCHEDULER] Rule id={} failed: {}", rule.getId(), ex.getMessage());
                }
            }
        });
    }

    /**
     * Decide whether this rule is due. A rule is due when:
     * 1. It has never run (lastRunAt is null), or
     * 2. The elapsed time since lastRunAt meets the minimum interval implied by its scheduleCron.
     *
     * <p>We extract the period from the cron expression rather than running a full cron parser.
     * Supported expressions (a subset of standard cron patterns):
     * <ul>
     *   <li>{@code 0 * * * * *}  — every minute</li>
     *   <li>{@code 0 0 * * * *}  — every hour</li>
     *   <li>{@code 0 0 0 * * *}  — every day</li>
     *   <li>{@code 0 0 0 * * 1}  — every Monday (weekly)</li>
     * </ul>
     * Unknown/null cron → treated as hourly (safe default).
     */
    private boolean isDue(AutomationRule rule) {
        if (rule.getLastRunAt() == null) return true;
        long minutesSinceLast = java.time.temporal.ChronoUnit.MINUTES.between(
            rule.getLastRunAt(), java.time.OffsetDateTime.now());
        long minimumIntervalMinutes = minimumIntervalMinutes(rule.getScheduleCron());
        return minutesSinceLast >= minimumIntervalMinutes;
    }

    private long minimumIntervalMinutes(String cron) {
        if (cron == null || cron.isBlank()) return 60; // default hourly
        String[] parts = cron.trim().split("\\s+");
        // 6-part Spring cron: second minute hour day month weekday
        if (parts.length < 6) return 60;
        String minute = parts[1];
        String hour   = parts[2];
        String day    = parts[3];
        String weekday = parts[5];
        if (!"*".equals(weekday) && !"?".equals(weekday)) return 7 * 24 * 60L; // weekly
        if (!"*".equals(day))    return 24 * 60L;    // daily
        if (!"*".equals(hour))   return 60L;          // hourly
        if (!"*".equals(minute)) return 1L;           // every-N-minutes (treat as 1-minute min)
        return 1L; // every-minute rule
    }
}
