package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.reporting.KpiController;
import com.bcits.works.reporting.KpiService;
import com.bcits.works.reporting.MetricDefinition;

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
 * Unauthorized / cross-tenant access tests for the KPI API (RB-05 Stage 3, RB-40 §1). A non-member
 * is denied; aggregated views require {@code view_team_metrics}; defining metrics requires
 * {@code manage_metrics} — and nothing is read or written before the check.
 */
@Tag("unit")
class KpiControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final KpiService kpi = mock(KpiService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final KpiController controller = new KpiController(kpi, authenticatedUser, rbac);

    KpiControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private void deny(String permission) {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(permission));
    }

    @Test
    void personal_deniedForNonMember() {
        deny("view_items");
        assertThatThrownBy(() -> controller.personal(FOREIGN_WS, null))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(kpi, never()).personal(anyString(), anyString(), any());
    }

    @Test
    void aggregatedViews_requireViewTeamMetrics() {
        deny("view_team_metrics");
        assertThatThrownBy(() -> controller.team(FOREIGN_WS, "TEAM-1")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> controller.manager(FOREIGN_WS)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> controller.org(FOREIGN_WS)).isInstanceOf(ApiException.class);
        verify(kpi, never()).team(anyString(), anyString(), anyString());
        verify(kpi, never()).manager(anyString(), anyString());
    }

    @Test
    void createDefinition_requiresManageMetrics() {
        deny("manage_metrics");
        assertThatThrownBy(() -> controller.createDefinition(FOREIGN_WS, new MetricDefinition()))
            .isInstanceOf(ApiException.class);
        verify(kpi, never()).createDefinition(anyString(), anyString(), any());
    }
}
