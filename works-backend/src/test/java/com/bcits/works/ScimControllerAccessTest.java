package com.bcits.works;

import com.bcits.works.auth.RbacService;
import com.bcits.works.auth.ScimController;
import com.bcits.works.auth.ScimToken;

import com.bcits.works.auth.ScimTokenRepository;
import com.bcits.works.auth.api.UserRepository;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.auth.api.UserPiiService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unauthorized and cross-tenant access tests for the SCIM 2.0 API (RB-05 Stage 3, RB-40 §1).
 * Verifies that SCIM bearer tokens are workspace-scoped and cannot be used to access or modify
 * users in a different tenant.
 */
@Tag("unit")
class ScimControllerAccessTest {

    private static final String WS_A = "ws-alpha";

    private final ScimTokenRepository scimTokens = mock(ScimTokenRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final EventService events = mock(EventService.class);
    private final RbacService rbac = mock(RbacService.class);
    private final UserPiiService userPii = mock(UserPiiService.class);
    private final ScimController controller = new ScimController(scimTokens, users, jdbc, events, rbac, userPii);

    // ── auth gate ─────────────────────────────────────────────────────────────

    @Test
    void listUsers_rejectsRequestWithNoAuthHeader() {
        HttpServletRequest req = mockRequest(null);
        assertThatThrownBy(() -> controller.listUsers(req, 1, 100))
            .isInstanceOf(ApiException.class);
        verify(scimTokens, never()).findByTokenHashAndRevokedAtIsNull(anyString());
    }

    @Test
    void listUsers_rejectsMalformedAuthHeader() {
        HttpServletRequest req = mockRequest("Basic dXNlcjpwYXNz");  // Basic, not Bearer
        assertThatThrownBy(() -> controller.listUsers(req, 1, 100))
            .isInstanceOf(ApiException.class);
        verify(scimTokens, never()).findByTokenHashAndRevokedAtIsNull(anyString());
    }

    @Test
    void listUsers_rejectsInvalidOrRevokedToken() {
        HttpServletRequest req = mockRequest("Bearer invalid-or-revoked-token");
        when(scimTokens.findByTokenHashAndRevokedAtIsNull(anyString())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> controller.listUsers(req, 1, 100))
            .isInstanceOf(ApiException.class);
    }

    // ── cross-workspace isolation ──────────────────────────────────────────────

    @Test
    void deleteUser_rejectsWhenUserNotInTokenWorkspace() {
        // A WS-A token is presented, but the target user "USR-B1" belongs only to WS-B.
        String rawToken = "scim-token-ws-a-delete-test";
        HttpServletRequest req = mockRequest("Bearer " + rawToken);
        when(scimTokens.findByTokenHashAndRevokedAtIsNull(sha256(rawToken)))
            .thenReturn(Optional.of(scimTokenOf(WS_A, rawToken)));
        // isWorkspaceMember(WS_A, "USR-B1") → 0 (not a member)
        when(jdbc.queryForObject(contains("workspace_members"), eq(Integer.class), eq(WS_A), eq("USR-B1")))
            .thenReturn(0);

        assertThatThrownBy(() -> controller.deleteUser(req, "USR-B1"))
            .isInstanceOf(ApiException.class);
        // Deprovisioning event must never fire for the foreign user
        verify(events, never()).recordInWorkspace(eq(WS_A), eq("USR-B1"), anyString(), anyString(), any());
    }

    @Test
    void updateUser_rejectsWhenUserNotInTokenWorkspace() {
        // A WS-A token cannot be used to update a user who is not in WS-A.
        String rawToken = "scim-token-ws-a-update-test";
        HttpServletRequest req = mockRequest("Bearer " + rawToken);
        when(scimTokens.findByTokenHashAndRevokedAtIsNull(sha256(rawToken)))
            .thenReturn(Optional.of(scimTokenOf(WS_A, rawToken)));
        when(jdbc.queryForObject(contains("workspace_members"), eq(Integer.class), eq(WS_A), eq("USR-B1")))
            .thenReturn(0);

        assertThatThrownBy(() -> controller.updateUser(req, "USR-B1", Map.of("displayName", "Hacker")))
            .isInstanceOf(ApiException.class);
        verify(users, never()).save(any());
    }

    // ── token issuance ───────────────────────────────────────────────────────

    @Test
    void issueToken_rejectsRequestWithoutAuthenticatedJwtUser() {
        HttpServletRequest req = mock(HttpServletRequest.class);

        var response = controller.issueToken(WS_A, Map.of("label", "Okta"), req);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
        verify(scimTokens, never()).save(any());
    }

    @Test
    void issueToken_requiresSecurityOrIntegrationPermission() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getAttribute("authenticatedUserId")).thenReturn("USR-1");
        when(rbac.canDo("USR-1", WS_A, "manage_security")).thenReturn(false);
        when(rbac.canDo("USR-1", WS_A, "manage_integrations")).thenReturn(false);

        assertThatThrownBy(() -> controller.issueToken(WS_A, Map.of("label", "Okta"), req))
            .isInstanceOf(ApiException.class);

        verify(scimTokens, never()).save(any());
        verify(events, never()).recordInWorkspace(anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void issueToken_allowsManageSecurity() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getAttribute("authenticatedUserId")).thenReturn("USR-1");
        when(rbac.canDo("USR-1", WS_A, "manage_security")).thenReturn(true);

        var response = controller.issueToken(WS_A, Map.of("label", "Okta"), req);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        verify(scimTokens).save(any(ScimToken.class));
        verify(events).recordInWorkspace(eq(WS_A), anyString(), eq("SCIM_TOKEN_ISSUED"),
            eq("USR-1"), any());
    }

    @Test
    void issueToken_allowsManageIntegrations() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getAttribute("authenticatedUserId")).thenReturn("USR-1");
        when(rbac.canDo("USR-1", WS_A, "manage_security")).thenReturn(false);
        when(rbac.canDo("USR-1", WS_A, "manage_integrations")).thenReturn(true);

        var response = controller.issueToken(WS_A, Map.of("label", "Okta"), req);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        verify(scimTokens).save(any(ScimToken.class));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static HttpServletRequest mockRequest(String authHeader) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("Authorization")).thenReturn(authHeader);
        return req;
    }

    private static ScimToken scimTokenOf(String workspaceId, String rawToken) {
        ScimToken t = new ScimToken();
        t.setId("SCIM-TEST-01");
        t.setWorkspaceId(workspaceId);
        t.setTokenHash(sha256(rawToken));
        return t;
    }

    private static String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
