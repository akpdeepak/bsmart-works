package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unauthorized / cross-tenant access tests for the integrations API (RB-05 Stage 3, RB-40 §1).
 */
@Tag("unit")
class IntegrationControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final IntegrationService integrations = mock(IntegrationService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final IntegrationController controller = new IntegrationController(integrations, authenticatedUser, rbac);

    IntegrationControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private void deny(String permission) {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(permission));
    }

    @Test
    void list_deniedForNonMember() {
        deny("view_items");
        assertThatThrownBy(() -> controller.list(FOREIGN_WS)).isInstanceOf(ApiException.class);
        verify(integrations, never()).list(anyString());
    }

    @Test
    void connect_requiresManageIntegrations() {
        deny("manage_integrations");
        var req = new IntegrationController.ConnectRequest("SLACK", "x", "{}");
        assertThatThrownBy(() -> controller.connect(FOREIGN_WS, req)).isInstanceOf(ApiException.class);
        verify(integrations, never()).connect(anyString(), anyString(), any(), any(), any());
    }

    @Test
    void inboundEmail_requiresCreateItems() {
        deny("create_items");
        var req = new IntegrationController.InboundEmailRequest("subj", "body", null);
        assertThatThrownBy(() -> controller.inboundEmail(FOREIGN_WS, req)).isInstanceOf(ApiException.class);
        verify(integrations, never()).ingestInboundEmail(anyString(), anyString(), any(), any(), any());
    }
}
