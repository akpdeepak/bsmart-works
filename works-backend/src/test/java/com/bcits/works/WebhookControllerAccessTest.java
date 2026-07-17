package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.automation.WebhookController;
import com.bcits.works.automation.WebhookSubscription;

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
 * Unauthorized / cross-tenant access tests for the webhooks API (RB-05 Stage 3, RB-40 §1).
 */
@Tag("unit")
class WebhookControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final WebhookService webhooks = mock(WebhookService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final WebhookController controller = new WebhookController(webhooks, authenticatedUser, rbac);

    WebhookControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private void deny(String permission) {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(permission));
    }

    @Test
    void list_deniedForNonMember() {
        deny("view_items");
        assertThatThrownBy(() -> controller.list(FOREIGN_WS)).isInstanceOf(ApiException.class);
        verify(webhooks, never()).list(anyString());
    }

    @Test
    void create_requiresManageIntegrations() {
        deny("manage_integrations");
        assertThatThrownBy(() -> controller.create(FOREIGN_WS, new WebhookSubscription()))
            .isInstanceOf(ApiException.class);
        verify(webhooks, never()).create(anyString(), anyString(), any());
    }

    @Test
    void redeliver_requiresManageIntegrations() {
        deny("manage_integrations");
        assertThatThrownBy(() -> controller.redeliver(FOREIGN_WS, "WHD-1")).isInstanceOf(ApiException.class);
        verify(webhooks, never()).redeliver(anyString(), anyString());
    }
}
