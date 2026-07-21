package com.bcits.works;
import com.bcits.works.reporting.CustomDashboardController;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.reporting.Dashboard;
import com.bcits.works.reporting.DashboardLayoutService;
import com.bcits.works.reporting.DashboardRepository;
import com.bcits.works.reporting.DashboardWidgetRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant access tests for CustomDashboardController (RB-40 §1, RB-05 Stage 3).
 * Dashboard carries workspaceId directly (Pattern B).
 * A caller whose workspace differs is denied with FORBIDDEN (403) before any mutation runs.
 */
@Tag("unit")
class CustomDashboardControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";
    private static final String PERM = "view_items";

    private final DashboardRepository dashboardRepository = mock(DashboardRepository.class);
    private final DashboardWidgetRepository widgetRepository = mock(DashboardWidgetRepository.class);
    private final DashboardLayoutService layoutService = mock(DashboardLayoutService.class);
    private final EventService eventService = mock(EventService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final CustomDashboardController controller = new CustomDashboardController(
            dashboardRepository, widgetRepository, layoutService, eventService, authenticatedUser, rbac);

    CustomDashboardControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(PERM));
    }

    private Dashboard dashboardInForeignWorkspace() {
        Dashboard d = new Dashboard();
        d.setId("DSH-1");
        d.setWorkspaceId(FOREIGN_WS);
        d.setName("Foreign dashboard");
        d.setOwnerId("other-user");
        return d;
    }

    @Test
    void get_crossTenantReturnsForbidden() {
        when(dashboardRepository.findById("DSH-1")).thenReturn(Optional.of(dashboardInForeignWorkspace()));

        assertThatThrownBy(() -> controller.get("DSH-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void get_unknownIdReturnsNotFound() {
        when(dashboardRepository.findById("DSH-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.get("DSH-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void update_crossTenantReturnsForbidden() {
        when(dashboardRepository.findById("DSH-1")).thenReturn(Optional.of(dashboardInForeignWorkspace()));

        assertThatThrownBy(() -> controller.update("DSH-1", new Dashboard()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(dashboardRepository, never()).save(any());
    }

    @Test
    void update_unknownIdReturnsNotFound() {
        when(dashboardRepository.findById("DSH-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("DSH-missing", new Dashboard()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void delete_crossTenantReturnsForbidden() {
        when(dashboardRepository.findById("DSH-1")).thenReturn(Optional.of(dashboardInForeignWorkspace()));

        assertThatThrownBy(() -> controller.delete("DSH-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(dashboardRepository, never()).deleteById(any());
    }
}
