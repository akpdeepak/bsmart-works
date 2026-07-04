package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Tag("unit")
class DashboardControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String WORKSPACE = "ws-A";

    private final DashboardService dashboardService = mock(DashboardService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final DashboardController controller =
            new DashboardController(dashboardService, authenticatedUser, rbac);

    DashboardControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    @Test
    void developerDashboardUsesAuthenticatedUserOnly() {
        when(dashboardService.getDeveloperDashboard(CALLER)).thenReturn(Map.of("myOpenItemCount", 0));

        var response = controller.getDeveloperDashboard();

        assertThat(response.getBody()).containsEntry("myOpenItemCount", 0);
        verify(dashboardService).getDeveloperDashboard(CALLER);
        verify(dashboardService, never()).getDeveloperDashboard("other-user");
    }

    @Test
    void scrumDashboardRequiresWorkspaceViewBeforeServiceCall() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, WORKSPACE, "view_items");

        assertThatThrownBy(() -> controller.getScrumMasterDashboard(WORKSPACE))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(dashboardService, never()).getScrumMasterDashboard(anyString());
    }

    @Test
    void adminDashboardRequiresManageRolesBeforeServiceCall() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, WORKSPACE, "manage_roles");

        assertThatThrownBy(() -> controller.getAdminDashboard(WORKSPACE))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(dashboardService, never()).getAdminDashboard(anyString());
    }

    @Test
    void productDashboardPassesExplicitWorkspaceAfterAuthorization() {
        when(dashboardService.getProductOwnerDashboard(WORKSPACE)).thenReturn(Map.of("releases", 0));

        controller.getProductOwnerDashboard(WORKSPACE);

        verify(rbac).require(eq(CALLER), eq(WORKSPACE), eq("view_items"));
        verify(dashboardService).getProductOwnerDashboard(WORKSPACE);
    }
}
