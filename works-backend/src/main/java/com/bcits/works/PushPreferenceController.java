package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * Push / notification preferences (iteration 18, Cap S). Per-user, so the authenticated user is the
 * only subject — no workspace scope and no RBAC beyond authentication (a user owns their own
 * preferences). The richer superset of the legacy {@code /notification-preferences} endpoint:
 * per-event-type toggles, quiet hours, snooze, and the P0-overrides-quiet rule. Business rules and
 * validation live in {@link PushPreferenceService} (RB-10 §2).
 */
@RestController
@RequestMapping("/api/v1/push/preferences")
public class PushPreferenceController {

    private final AuthenticatedUser authenticatedUser;
    private final PushPreferenceService service;

    public PushPreferenceController(AuthenticatedUser authenticatedUser, PushPreferenceService service) {
        this.authenticatedUser = authenticatedUser;
        this.service = service;
    }

    @GetMapping
    public NotificationPreference get() {
        return service.get(authenticatedUser.id());
    }

    /**
     * Partial update — only the keys present in the body are changed, so a caller can flip a single
     * toggle without sending the whole object. {@code snoozeUntil} accepts an ISO-8601 instant or
     * null to clear the snooze.
     */
    @PutMapping
    public NotificationPreference update(@RequestBody Map<String, Object> body) {
        NotificationPreference p = service.get(authenticatedUser.id());
        if (body.containsKey("notifyAssign")) p.setNotifyAssign(asBool(body.get("notifyAssign")));
        if (body.containsKey("notifyComment")) p.setNotifyComment(asBool(body.get("notifyComment")));
        if (body.containsKey("notifyMention")) p.setNotifyMention(asBool(body.get("notifyMention")));
        if (body.containsKey("emailDigest")) p.setEmailDigest(asBool(body.get("emailDigest")));
        if (body.containsKey("notifyStatusChange")) p.setNotifyStatusChange(asBool(body.get("notifyStatusChange")));
        if (body.containsKey("notifySlaBreach")) p.setNotifySlaBreach(asBool(body.get("notifySlaBreach")));
        if (body.containsKey("notifyAutomation")) p.setNotifyAutomation(asBool(body.get("notifyAutomation")));
        if (body.containsKey("pushEnabled")) p.setPushEnabled(asBool(body.get("pushEnabled")));
        if (body.containsKey("quietHoursEnabled")) p.setQuietHoursEnabled(asBool(body.get("quietHoursEnabled")));
        if (body.containsKey("quietHoursStart")) p.setQuietHoursStart(asInt(body.get("quietHoursStart")));
        if (body.containsKey("quietHoursEnd")) p.setQuietHoursEnd(asInt(body.get("quietHoursEnd")));
        if (body.containsKey("p0OverrideQuiet")) p.setP0OverrideQuiet(asBool(body.get("p0OverrideQuiet")));
        if (body.containsKey("snoozeUntil")) p.setSnoozeUntil(asInstant(body.get("snoozeUntil"))); {
        return service.save(p);
        }
    }

    private static boolean asBool(Object o) {
        return o instanceof Boolean b ? b : Boolean.parseBoolean(String.valueOf(o));
    }

    private static int asInt(Object o) {
        if (o instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(o));
        } catch (NumberFormatException e) {
            throw ApiException.badRequest("INVALID_HOUR", "Quiet-hours value must be a number 0–23.");
        }
    }

    private static OffsetDateTime asInstant(Object o) {
        if (o == null) {
            return null;
        }
        String s = String.valueOf(o).trim();
        if (s.isEmpty() || "null".equals(s)) {
            return null;
        }
        try {
            return OffsetDateTime.parse(s);
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_SNOOZE", "snoozeUntil must be an ISO-8601 timestamp or null.");
        }
    }
}
