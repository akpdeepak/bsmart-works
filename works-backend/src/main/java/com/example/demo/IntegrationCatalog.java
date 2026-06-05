package com.example.demo;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The integration provider registry (iteration 13, Cap Q / Cap A). Declares each connector, its
 * category, the config fields the wizard must collect, and whether it supports inbound / outbound
 * flow. Slack / GitHub / GitLab / email / calendar are the tooling connectors; SAML / OIDC / SCIM
 * are the enterprise identity providers (SSO + provisioning). Pure registry, unit-testable.
 */
public final class IntegrationCatalog {

    private IntegrationCatalog() { }

    public record Provider(String id, String label, String category, List<String> requiredFields,
                           boolean inbound, boolean outbound) { }

    public static final String SLACK    = "SLACK";
    public static final String GITHUB   = "GITHUB";
    public static final String GITLAB   = "GITLAB";
    public static final String EMAIL    = "EMAIL";
    public static final String CALENDAR = "CALENDAR";
    public static final String SAML     = "SAML";
    public static final String OIDC     = "OIDC";
    public static final String SCIM     = "SCIM";

    private static final List<Provider> PROVIDERS = List.of(
        new Provider(SLACK, "Slack", "messaging", List.of("webhookUrl"), false, true),
        new Provider(GITHUB, "GitHub", "scm", List.of("repo", "token"), true, true),
        new Provider(GITLAB, "GitLab", "scm", List.of("project", "token"), true, true),
        new Provider(EMAIL, "Email", "email", List.of("inboundAddress"), true, true),
        new Provider(CALENDAR, "Calendar", "calendar", List.of("calendarId"), false, true),
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
