package com.bcits.works;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The integration provider registry (iteration 13, Cap Q / Cap A; extended in iteration 14 Cap U
 * for developer-workspace calendar sync). Declares each connector, its category, the config fields
 * the wizard must collect, and whether it supports inbound / outbound flow.
 *
 * <p>Tooling connectors: Slack / GitHub / GitLab / email / Google Calendar / Microsoft 365.
 * Enterprise identity providers: SAML / OIDC / SCIM (SSO + provisioning).
 *
 * <p>The generic {@code CALENDAR} constant is kept for backwards compatibility; new code should
 * use the specific {@code GOOGLE_CALENDAR} or {@code MICROSOFT_365} constants so
 * {@link CalendarSyncService} can dispatch to the correct provider API.
 *
 * <p>Pure registry — unit-testable with no I/O.
 */
public final class IntegrationCatalog {

    private IntegrationCatalog() { }

    public record Provider(String id, String label, String category, List<String> requiredFields,
                           boolean inbound, boolean outbound) { }

    public static final String SLACK           = "SLACK";
    public static final String GITHUB          = "GITHUB";
    public static final String GITLAB          = "GITLAB";
    public static final String EMAIL           = "EMAIL";
    /** Generic calendar marker — kept for backwards compatibility. */
    public static final String CALENDAR        = "CALENDAR";
    /** Google Calendar: sync personal events into the Developer Workspace (Cap U, iteration 14). */
    public static final String GOOGLE_CALENDAR = "GOOGLE_CALENDAR";
    /** Microsoft 365 Outlook calendar: sync personal events (Cap U, iteration 14). */
    public static final String MICROSOFT_365   = "MICROSOFT_365";
    public static final String SAML            = "SAML";
    public static final String OIDC            = "OIDC";
    public static final String SCIM            = "SCIM";

    private static final List<Provider> PROVIDERS = List.of(
        new Provider(SLACK, "Slack", "messaging", List.of("webhookUrl"), false, true),
        new Provider(GITHUB, "GitHub", "scm", List.of("repo", "token"), true, true),
        new Provider(GITLAB, "GitLab", "scm", List.of("project", "token"), true, true),
        new Provider(EMAIL, "Email", "email", List.of("inboundAddress"), true, true),
        new Provider(CALENDAR, "Calendar (generic)", "calendar", List.of("calendarId"), false, true),
        new Provider(GOOGLE_CALENDAR, "Google Calendar", "calendar",
            List.of("clientId", "clientSecret", "refreshToken"), true, false),
        new Provider(MICROSOFT_365, "Microsoft 365", "calendar",
            List.of("tenantId", "clientId", "clientSecret"), true, false),
        new Provider(SAML, "SAML SSO", "identity", List.of("metadataUrl"), true, false),
        new Provider(OIDC, "OIDC SSO", "identity", List.of("issuer", "clientId"), true, false),
        new Provider(SCIM, "SCIM provisioning", "identity", List.of("scimEndpoint", "bearerToken"), true, false)
    );

    private static final Map<String, Provider> BY_ID =
        PROVIDERS.stream().collect(Collectors.toMap(Provider::id, p -> p));

    public static List<Provider> all() {
        return PROVIDERS;
    }

    public static boolean isProvider(String id) {
        return id != null && BY_ID.containsKey(id.trim().toUpperCase());
    }

    public static Provider get(String id) {
        return id == null ? null : BY_ID.get(id.trim().toUpperCase());
    }

    public static List<String> requiredFields(String id) {
        Provider p = get(id);
        return p == null ? List.of() : p.requiredFields();
    }
}
