package com.bcits.works;
import com.bcits.works.security.AccessAnomaly;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Heuristic access-anomaly detection (RB-40 §4; iteration 19 Cap T). The spec frames this as an AI
 * capability; per the AI Control Plane fallback contract (RB-40 §2) the deterministic rules here
 * are the always-available fallback when AI is off, over budget, or unavailable — so anomaly
 * detection never silently stops. An AI tier can later re-rank/enrich these same findings.
 *
 * <p>Pure and deterministic — no Spring, no DB, no clock (RB-10 §2). The caller supplies the signal
 * and the user's known baseline; this returns zero or more findings.
 */
public final class AnomalyDetector {

    private AnomalyDetector() {}

    /** One access event plus the user's baseline, as observed by the service. */
    public record AccessSignal(
            String userId,
            String countryCode,           // ISO country of this access
            Set<String> usualCountries,   // countries the user normally signs in from
            int localHour,                // 0–23, local time of the access
            int exportedInWindow,         // records exported in the recent short window
            int dailyExportNorm,          // the user's typical daily export volume
            boolean privilegeEscalated,   // tier was raised in this action
            Integer minutesSincePrevLogin,// time since the previous login from a different country
            boolean differentCountryThanPrev) {
    }

    /** A detected anomaly, ready to persist as an {@link AccessAnomaly}. */
    public record Finding(String type, String severity, String summary, String evidence) {}

    /** Off-hours is before 06:00 or after 22:00 local — a coarse but useful signal. */
    static boolean isOffHours(int localHour) {
        return localHour < 6 || localHour >= 22;
    }

    public static List<Finding> detect(AccessSignal s) {
        List<Finding> findings = new ArrayList<>();
        if (s == null) return findings;

        // New geography — a sign-in from a country the user has never used before.
        if (s.countryCode() != null && s.usualCountries() != null
                && !s.usualCountries().isEmpty()
                && !s.usualCountries().contains(s.countryCode())) {
            String severity = isOffHours(s.localHour()) ? "HIGH" : "MEDIUM";
            findings.add(new Finding("NEW_GEO", severity,
                    "Sign-in from a new country (" + s.countryCode() + ") at "
                            + pad(s.localHour()) + ":00 local",
                    "{\"country\":\"" + s.countryCode() + "\",\"localHour\":" + s.localHour()
                            + ",\"usualCountries\":" + jsonArray(s.usualCountries()) + "}"));
        }

        // Mass export — a burst far above the user's daily norm.
        if (s.dailyExportNorm() >= 0 && s.exportedInWindow() > 0) {
            int threshold = Math.max(100, s.dailyExportNorm() * 5);
            if (s.exportedInWindow() >= threshold) {
                findings.add(new Finding("MASS_EXPORT", "MEDIUM",
                        "Exported " + s.exportedInWindow() + " records in a short window — well above "
                                + "the user's daily norm of " + s.dailyExportNorm(),
                        "{\"exported\":" + s.exportedInWindow() + ",\"dailyNorm\":"
                                + s.dailyExportNorm() + "}"));
            }
        }

        // Privilege escalation — a role/tier increase is always worth surfacing.
        if (s.privilegeEscalated()) {
            findings.add(new Finding("PERMISSION_ESCALATION", "HIGH",
                    "A privilege escalation was performed for this user",
                    "{\"escalated\":true}"));
        }

        // Impossible travel — two logins from different countries too close together to be physical.
        if (s.differentCountryThanPrev() && s.minutesSincePrevLogin() != null
                && s.minutesSincePrevLogin() < 120) {
            findings.add(new Finding("IMPOSSIBLE_TRAVEL", "HIGH",
                    "Two sign-ins from different countries " + s.minutesSincePrevLogin()
                            + " minutes apart — physically impossible travel",
                    "{\"minutesApart\":" + s.minutesSincePrevLogin() + "}"));
        }

        // Off-hours access on its own is a low-severity signal (only if not already a NEW_GEO HIGH).
        if (isOffHours(s.localHour()) && findings.stream().noneMatch(f -> f.type().equals("NEW_GEO"))) {
            findings.add(new Finding("OFF_HOURS_ACCESS", "LOW",
                    "Access at " + pad(s.localHour()) + ":00 local, outside business hours",
                    "{\"localHour\":" + s.localHour() + "}"));
        }
        return findings;
    }

    private static String pad(int hour) {
        return (hour < 10 ? "0" : "") + hour;
    }

    private static String jsonArray(Set<String> values) {
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        for (String v : values) {
            if (!first) sb.append(","); {
            sb.append("\"").append(v).append("\"");
            }
            first = false;
        }
        return sb.append("]").toString();
    }
}
