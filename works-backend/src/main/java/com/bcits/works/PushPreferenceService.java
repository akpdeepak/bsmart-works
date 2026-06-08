package com.bcits.works;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;

/**
 * Notification / push preferences (iteration 18, Cap S). Owns the get/update of a user's
 * {@link NotificationPreference} row and — the part that earns its place — the pure delivery
 * decision: given a preference set, an event type, a priority, and "now", should this event push?
 *
 * <p>The decision honours the spec exactly (RB-20 §4 honest software): per-event-type opt-out,
 * a quiet-hours window, a snooze deadline, and the P0-overrides-quiet on-call safety valve. It is
 * deliberately free of I/O so it is unit-tested against every category (RB-05 Stage 3).
 */
@Service
public class PushPreferenceService {

    private final NotificationPreferenceRepository repo;

    public PushPreferenceService(NotificationPreferenceRepository repo) {
        this.repo = repo;
    }

    /** The user's preferences, seeding (and persisting) defaults the first time they are read. */
    public NotificationPreference get(String userId) {
        return repo.findById(userId).orElseGet(() -> {
            NotificationPreference p = new NotificationPreference();
            p.setUserId(userId);
            return repo.save(p);
        });
    }

    public NotificationPreference save(NotificationPreference pref) {
        validate(pref);
        return repo.save(pref);
    }

    private void validate(NotificationPreference p) {
        if (p.getQuietHoursStart() < 0 || p.getQuietHoursStart() > 23
                || p.getQuietHoursEnd() < 0 || p.getQuietHoursEnd() > 23) {
            throw ApiException.badRequest("INVALID_QUIET_HOURS",
                    "Quiet-hours start and end must be an hour of day between 0 and 23.");
        }
    }

    /**
     * Should an event of {@code eventType} at {@code priority} be pushed to this user right now?
     *
     * @param priority free-form; "P0" or "CRITICAL" (any case) is treated as the critical tier that
     *                 can pierce quiet hours / snooze when {@code p0OverrideQuiet} is on.
     */
    public boolean shouldDeliver(NotificationPreference pref, String eventType, String priority,
                                 OffsetDateTime now) {
        if (pref == null || !pref.isPushEnabled()) {
            return false;
        }
        if (!typeEnabled(pref, eventType)) {
            return false;
        }
        boolean critical = isCritical(priority);
        boolean canPierce = critical && pref.isP0OverrideQuiet();

        // Snooze: suppress everything until the deadline, unless a critical event may pierce it.
        if (pref.getSnoozeUntil() != null && now.isBefore(pref.getSnoozeUntil()) && !canPierce) {
            return false;
        }
        // Quiet hours: suppress unless a critical event may pierce it.
        if (pref.isQuietHoursEnabled() && inQuietHours(now, pref.getQuietHoursStart(), pref.getQuietHoursEnd())
                && !canPierce) {
            return false;
        }
        return true;
    }

    static boolean isCritical(String priority) {
        return priority != null
                && ("p0".equalsIgnoreCase(priority) || "critical".equalsIgnoreCase(priority));
    }

    /** Map an event type to its per-type toggle; unknown types default to deliverable. */
    static boolean typeEnabled(NotificationPreference p, String eventType) {
        if (eventType == null) {
            return true;
        }
        return switch (eventType.toUpperCase()) {
            case "ASSIGN", "ASSIGNED" -> p.isNotifyAssign();
            case "COMMENT" -> p.isNotifyComment();
            case "MENTION" -> p.isNotifyMention();
            case "STATUS_CHANGE", "STATUS" -> p.isNotifyStatusChange();
            case "SLA_BREACH", "SLA" -> p.isNotifySlaBreach();
            case "AUTOMATION" -> p.isNotifyAutomation();
            default -> true;
        };
    }

    /**
     * Is {@code now}'s hour-of-day inside the [start, end) quiet window? Handles a window that wraps
     * past midnight (e.g. 22 → 7 means 22,23,0,…,6). start == end means a full-day quiet window.
     */
    static boolean inQuietHours(OffsetDateTime now, int start, int end) {
        int h = now.getHour();
        if (start == end) {
            return true;
        }
        if (start < end) {
            return h >= start && h < end;
        }
        return h >= start || h < end;
    }
}
