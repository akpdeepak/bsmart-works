package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * API-boundary privacy tests for the KPI views — the non-negotiable unauthorized / cross-boundary
 * scenarios for iteration 12. These prove the guarantees hold in the controller wiring, before any
 * data is touched, without a live database:
 * <ul>
 *   <li>a caller without the layer's permission is denied (RBAC in the service boundary);</li>
 *   <li>passing an individual identifier to an aggregated layer (the "manager drills into an
 *       engineer" attack) is a hard 403 — the computation engine is never reached;</li>
 *   <li>viewing another person's personal metrics without an active share is denied.</li>
 * </ul>
 */
@Tag("unit")
class KpiControllerAccessTest {

    private static final String CALLER = "USR-caller";
    private static final String WS = "WS-1";

    private final MetricDefinitionRepository defs = mock(MetricDefinitionRepository.class);
    private final MetricShareRepository shares = mock(MetricShareRepository.class);
    private final WorkspaceKpiSettingsRepository settings = mock(WorkspaceKpiSettingsRepository.class);
    private final TeamRepository teams = mock(TeamRepository.class);
    private final KpiComputationService computation = mock(KpiComputationService.class);

    private final AggregationService aggregation = new AggregationService();
    private final KpiPrivacyService privacy = new KpiPrivacyService();
    private final CycleTimeStatsService stats = new CycleTimeStatsService();
    private final TeamHealthService health = new TeamHealthService();
    private final TeamHealthNarrativeService narrative = new TeamHealthNarrativeService();

    private final RbacService rbac = mock(RbacService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);

    private final KpiService kpi = new KpiService(defs, shares, settings, teams,
        aggregation, computation, privacy, stats, health, narrative, rbac);

    private final KpiController controller = new KpiController(kpi, privacy, rbac, authenticatedUser);

    KpiControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    @Test
    void teamView_deniedWithoutTeamMetricsPermission() {
        org.mockito.Mockito.doThrow(ApiException.forbidden("denied"))
            .when(rbac).require(eq(CALLER), eq(WS), eq("view_team_metrics"));

        assertThatThrownBy(() -> controller.view(WS, "TEAM", null, null, null))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        // Denied before any metric is computed.
        verifyNoInteractions(computation);
    }

    @Test
    void managerView_cannotDrillIntoAnIndividual_evenViaApi() {
        // Caller has the team-metrics permission, but asks for a specific person's data on MANAGER.
        // This is the exact attack the iteration exists to prevent → hard 403, engine untouched.
        assertThatThrownBy(() -> controller.view(WS, "MANAGER", null, null, "USR-victim"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verifyNoInteractions(computation);
    }

    @Test
    void orgView_alsoRejectsIndividualScope() {
        assertThatThrownBy(() -> controller.view(WS, "ORG", null, null, "USR-victim"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(computation);
    }

    @Test
    void personalView_ofAnotherPerson_deniedWithoutAnActiveShare() {
        when(shares.findBySharedWithId(CALLER)).thenReturn(List.of());

        assertThatThrownBy(() -> controller.view(WS, "PERSONAL", null, null, "USR-other"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verifyNoInteractions(computation);
    }

    @Test
    void personalCycleTime_ofAnotherPerson_deniedWithoutAnActiveShare() {
        // Regression: the cycle-time endpoint must treat userId as the *target*, not the requester,
        // so the share-gate runs as assertCanViewPersonal(caller, target) and 403s without a share.
        when(shares.findBySharedWithId(CALLER)).thenReturn(List.of());

        assertThatThrownBy(() -> controller.cycleTime(WS, "PERSONAL", null, null, "USR-victim"))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verifyNoInteractions(computation);
    }

    @Test
    void projectView_ofAForeignWorkspaceProject_isDeniedForTenantIsolation() {
        // A LEAD authorized in WS must not read a project that belongs to another workspace.
        when(rbac.workspaceForProject("PROJ-foreign")).thenReturn("WS-OTHER");

        assertThatThrownBy(() -> controller.view(WS, "PROJECT", "PROJ-foreign", null, null))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verifyNoInteractions(computation);
    }
}
