package com.bcits.works;

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
 * Unauthorized / cross-tenant access tests for the automation API (RB-05 Stage 3, RB-40 §1).
 */
@Tag("unit")
class AutomationControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final AutomationService automation = mock(AutomationService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final AutomationController controller = new AutomationController(automation, authenticatedUser, rbac);

    AutomationControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private void deny(String permission) {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(permission));
    }

    @Test
    void list_deniedForNonMember() {
        deny("view_items");
        assertThatThrownBy(() -> controller.list(FOREIGN_WS)).isInstanceOf(ApiException.class);
        verify(automation, never()).list(anyString());
    }

    @Test
    void create_requiresManageAutomations() {
        deny("manage_automations");
        assertThatThrownBy(() -> controller.create(FOREIGN_WS, new AutomationRule())).isInstanceOf(ApiException.class);
        verify(automation, never()).create(anyString(), anyString(), any());
    }

    @Test
    void test_andRun_requireManageAutomations() {
        deny("manage_automations");
        assertThatThrownBy(() -> controller.test(FOREIGN_WS, "AUTO-1")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> controller.run(FOREIGN_WS, "AUTO-1")).isInstanceOf(ApiException.class);
        verify(automation, never()).test(anyString(), anyString());
        verify(automation, never()).runNow(anyString(), anyString(), anyString());
    }
}
