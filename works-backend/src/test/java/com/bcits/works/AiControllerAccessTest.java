package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
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
 * Unauthorized / cross-tenant access tests for the AI Control Plane management API (RB-05 Stage 3,
 * RB-40 §1). A caller who is not a member of the target workspace — or who lacks {@code manage_ai}
 * for writes and the audit log — is denied before any policy, budget, or audit row is touched.
 */
@Tag("unit")
class AiControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";   // a workspace the caller is NOT in

    private final AiControlPlaneService cp = mock(AiControlPlaneService.class);
    private final AiInvocationRepository invocations = mock(AiInvocationRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final AiWorkspaceSettingsService settings = mock(AiWorkspaceSettingsService.class);
    private final DashboardSummaryService dashboardSummary = mock(DashboardSummaryService.class);

    private final AiController controller =
        new AiController(cp, invocations, authenticatedUser, rbac, settings, dashboardSummary);

    AiControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private void deny(String permission) {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(permission));
    }

    @Test
    void capabilities_deniedForNonMember() {
        deny("view_items");
        assertThatThrownBy(() -> controller.capabilities(FOREIGN_WS))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void setPolicy_deniedWithoutManageAi_andNothingPersisted() {
        deny("manage_ai");
        var req = new AiController.PolicyRequest("WORKSPACE", null, null, false);
        assertThatThrownBy(() -> controller.setPolicy(FOREIGN_WS, req)).isInstanceOf(ApiException.class);
        verify(cp, never()).setPolicy(anyString(), anyString(), any(), any(), org.mockito.ArgumentMatchers.anyBoolean());
    }

    @Test
    void setBudget_deniedWithoutManageAi() {
        deny("manage_ai");
        assertThatThrownBy(() -> controller.setBudget(FOREIGN_WS, new AiController.BudgetRequest(5000L)))
            .isInstanceOf(ApiException.class);
        verify(cp, never()).setBudgetCap(anyString(), org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    void auditLog_isAdminOnly() {
        deny("manage_ai");
        assertThatThrownBy(() -> controller.auditLog(FOREIGN_WS, 0, 50)).isInstanceOf(ApiException.class);
        verify(invocations, never()).findByWorkspaceIdOrderByCreatedAtDesc(anyString(), any());
    }

    @Test
    void dashboardSummary_delegatesToServiceWhichEnforcesViewItems() {
        // The service owns RBAC (view_items) — denial there propagates through the controller.
        when(dashboardSummary.summarize(eq(FOREIGN_WS), eq(CALLER), any(), any(),
            org.mockito.ArgumentMatchers.anyBoolean()))
            .thenThrow(ApiException.forbidden("denied"));
        var req = new AiController.DashboardSummaryRequest("By status",
            java.util.List.of(java.util.Map.of("label", "Open", "value", 4)), true);
        assertThatThrownBy(() -> controller.dashboardSummary(FOREIGN_WS, req)).isInstanceOf(ApiException.class);
        verify(dashboardSummary).summarize(eq(FOREIGN_WS), eq(CALLER), any(), any(),
            org.mockito.ArgumentMatchers.anyBoolean());
    }
}
