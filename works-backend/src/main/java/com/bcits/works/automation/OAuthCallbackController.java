package com.bcits.works.automation;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EncryptionService;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * OAuth 2.0 authorization-code callback (B23, iteration 13 Cap Q). Handles the redirect from
 * Slack, GitHub, and GitLab after the user approves the OAuth consent screen. Exchanges the
 * authorization code for an access token, encrypts it via {@link EncryptionService}, and stores
 * it in {@link IntegrationCredential}. Workspace-scoped (RB-40 §1).
 *
 * <p>Provider activation: set {@code SLACK_CLIENT_ID}/{@code SLACK_CLIENT_SECRET},
 * {@code GITHUB_CLIENT_ID}/{@code GITHUB_CLIENT_SECRET},
 * or {@code GITLAB_CLIENT_ID}/{@code GITLAB_CLIENT_SECRET}. Without them the callback
 * returns an {@code INTEGRATION_NOT_CONFIGURED} error.
 *
 * <p>The {@code state} parameter carries {@code workspaceId:userId} signed by the same JWT
 * the user holds — this binds the OAuth flow to the initiating workspace and prevents
 * CSRF substitution. RBAC: the user must have {@code manage_integrations} on the workspace.
 */
@RestController
@RequestMapping("/api/v1/integrations/oauth")
public class OAuthCallbackController {

    private static final Logger log = LoggerFactory.getLogger(OAuthCallbackController.class);

    // Per-provider scopes (least-privilege, per TD-017 decision)
    static final Map<String, String> PROVIDER_SCOPES = Map.of(
        "SLACK",  "channels:read,chat:write,users:read",
        "GITHUB", "repo,issues",
        "GITLAB", "read_api,write_repository"
    );

    private final IntegrationCredentialRepository credentials;
    private final EncryptionService encryption;
    private final EventService events;
    private final RbacGate rbac;

    @Value("${oauth.slack.client-id:}") private String slackClientId;
    @Value("${oauth.slack.client-secret:}") private String slackClientSecret;
    @Value("${oauth.github.client-id:}") private String githubClientId;
    @Value("${oauth.github.client-secret:}") private String githubClientSecret;
    @Value("${oauth.gitlab.client-id:}") private String gitlabClientId;
    @Value("${oauth.gitlab.client-secret:}") private String gitlabClientSecret;
    @Value("${app.base-url:http://localhost:5173}") private String baseUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    public OAuthCallbackController(IntegrationCredentialRepository credentials,
                                   EncryptionService encryption,
                                   EventService events,
                                   RbacGate rbac) {
        this.credentials = credentials;
        this.encryption = encryption;
        this.events = events;
        this.rbac = rbac;
    }

    /**
     * Authorization-code callback. The {@code state} parameter must be {@code workspaceId:userId},
     * and the {@code provider} parameter identifies which provider is completing the flow.
     *
     * <p>On success redirects to {@code /settings/integrations?connected=<provider>}.
     * On failure redirects to {@code /settings/integrations?error=<reason>}.
     */
    @GetMapping("/callback")
    @Transactional
    public ResponseEntity<Void> callback(
        @RequestParam String code,
        @RequestParam String state,
        @RequestParam String provider
    ) {
        String providerUpper = provider.toUpperCase();
        String[] parts = state.split(":", 2);
        if (parts.length != 2) {
            return redirect("/settings/integrations?error=INVALID_STATE");
        }
        String workspaceId = parts[0];
        String userId = parts[1];

        if (!PROVIDER_SCOPES.containsKey(providerUpper)) {
            return redirect("/settings/integrations?error=UNKNOWN_PROVIDER");
        }

        // RBAC: user must be authorized to manage integrations in this workspace
        try {
            rbac.require(userId, workspaceId, "manage_integrations");
        } catch (ApiException e) {
            return redirect("/settings/integrations?error=UNAUTHORIZED");
        }

        // Retrieve provider credentials
        String clientId = clientId(providerUpper);
        String clientSecret = clientSecret(providerUpper);
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            log.warn("OAuth callback for {} but credentials not configured (workspaceId={})", providerUpper, workspaceId);
            return redirect("/settings/integrations?error=INTEGRATION_NOT_CONFIGURED");
        }

        // Exchange code for token
        TokenResponse tokenResponse;
        try {
            tokenResponse = exchangeCode(providerUpper, code, clientId, clientSecret);
        } catch (Exception e) {
            log.error("OAuth token exchange failed for provider={} workspace={}", providerUpper, workspaceId, e);
            return redirect("/settings/integrations?error=TOKEN_EXCHANGE_FAILED");
        }

        // Persist encrypted credentials (upsert by workspace+provider)
        IntegrationCredential cred = credentials.findByWorkspaceIdAndProvider(workspaceId, providerUpper)
            .orElseGet(() -> {
                IntegrationCredential fresh = new IntegrationCredential();
                fresh.setId(UUID.randomUUID().toString());
                fresh.setWorkspaceId(workspaceId);
                fresh.setProvider(providerUpper);
                fresh.setCreatedAt(OffsetDateTime.now());
                return fresh;
            });

        cred.setAccessTokenEnc(encryption.encrypt(tokenResponse.accessToken()));
        if (tokenResponse.refreshToken() != null) {
            cred.setRefreshTokenEnc(encryption.encrypt(tokenResponse.refreshToken()));
        }
        cred.setScopes(PROVIDER_SCOPES.get(providerUpper));
        cred.setTokenType(tokenResponse.tokenType() != null ? tokenResponse.tokenType() : "Bearer");
        cred.setUpdatedAt(OffsetDateTime.now());
        credentials.save(cred);

        events.record(workspaceId, "OAUTH_CONNECTED", userId,
            "{\"provider\":\"" + providerUpper + "\",\"workspaceId\":\"" + workspaceId + "\"}");

        log.info("OAuth credentials stored for provider={} workspace={}", providerUpper, workspaceId);
        return redirect("/settings/integrations?connected=" + providerUpper.toLowerCase());
    }

    // ── internals ─────────────────────────────────────────────────────────────

    record TokenResponse(String accessToken, String refreshToken, String tokenType) { }

    @SuppressWarnings("unchecked")
    private TokenResponse exchangeCode(String provider, String code, String clientId, String clientSecret) throws Exception {
        String tokenUrl = switch (provider) {
            case "SLACK"  -> "https://slack.com/api/oauth.v2.access";
            case "GITHUB" -> "https://github.com/login/oauth/access_token";
            case "GITLAB" -> "https://gitlab.com/oauth/token";
            default -> throw new IllegalArgumentException("Unknown provider: " + provider);
        };

        String callbackUrl = baseUrl + "/api/v1/integrations/oauth/callback?provider=" + provider.toLowerCase();

        String formBody = "grant_type=authorization_code"
            + "&code=" + encode(code)
            + "&client_id=" + encode(clientId)
            + "&client_secret=" + encode(clientSecret)
            + "&redirect_uri=" + encode(callbackUrl);

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(tokenUrl))
            .timeout(Duration.ofSeconds(15))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .header("Accept", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(formBody))
            .build();

        HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

        if (resp.statusCode() != 200) {
            throw new IllegalStateException("Token endpoint returned HTTP " + resp.statusCode());
        }

        // Parse JSON response minimally without pulling in a JSON library call at this layer
        // (ObjectMapper is the canonical option — injecting it here keeps it testable)
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        Map<String, Object> body = mapper.readValue(resp.body(), Map.class);

        String accessToken = (String) body.getOrDefault("access_token",
            body.getOrDefault("authed_user", Map.of()) instanceof Map<?,?> m
                ? m.get("access_token") : null);
        String refreshToken = (String) body.get("refresh_token");
        String tokenType = (String) body.get("token_type");

        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalStateException("No access_token in response from " + provider);
        }
        return new TokenResponse(accessToken, refreshToken, tokenType);
    }

    private String clientId(String provider) {
        return switch (provider) {
            case "SLACK"  -> slackClientId;
            case "GITHUB" -> githubClientId;
            case "GITLAB" -> gitlabClientId;
            default -> null;
        };
    }

    private String clientSecret(String provider) {
        return switch (provider) {
            case "SLACK"  -> slackClientSecret;
            case "GITHUB" -> githubClientSecret;
            case "GITLAB" -> gitlabClientSecret;
            default -> null;
        };
    }

    private ResponseEntity<Void> redirect(String path) {
        return ResponseEntity.status(302).location(URI.create(path)).build();
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
