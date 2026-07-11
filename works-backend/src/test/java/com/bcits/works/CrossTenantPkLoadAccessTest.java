package com.bcits.works;

import com.bcits.works.auth.PermissionScheme;
import com.bcits.works.auth.PermissionSchemeController;
import com.bcits.works.auth.PermissionSchemeRepository;
import com.bcits.works.auth.PermissionSchemeService;
import com.bcits.works.auth.RoleDef;
import com.bcits.works.auth.RoleDefRepository;
import com.bcits.works.auth.RolePermissionRepository;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.FieldVisibilityRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;

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
 * #243 Slice D — the findById / primary-key-load gap. Hibernate's {@code @Filter} does not apply to a
 * by-PK load ({@code findById} / {@code em.find}), so a controller that loads a tenant-scoped entity by
 * id and then mutates it without re-checking ownership crosses tenants. These tests prove each
 * remediated endpoint re-checks workspace access (via {@code RbacService.require} or
 * {@code workspaceForWorkItem}+tier) and throws <b>before</b> any save/delete — pure Mockito, the same
 * shape as {@link FieldDefControllerAccessTest} / {@link PermissionSchemeControllerAccessTest}.
 */
@Tag("unit")
class CrossTenantPkLoadAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-foreign"; // a workspace the caller is NOT a member of

    private final RbacService rbac = mock(RbacService.class);
    private final AuthenticatedUser authedUser = mock(AuthenticatedUser.class);

    CrossTenantPkLoadAccessTest() {
        when(authedUser.id()).thenReturn(CALLER);
        // Any permission check against the foreign workspace is denied (caller is not a member).
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), anyString());
        // The work-item / workflow transitive paths resolve the foreign workspace then find tier 0.
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);
    }

    private static void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call).isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    private static void assertNotFound(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call).isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── WorkItemLinkController (was zero-RBAC) ────────────────────────────────
    @Test
    void workItemLink_endpoints_denyCrossTenant() {
        WorkItemLinkRepository linkRepo = mock(WorkItemLinkRepository.class);
        WorkItemRepository itemRepo = mock(WorkItemRepository.class);
        when(rbac.workspaceForWorkItem("WI-A")).thenReturn(FOREIGN_WS);
        WorkItemLinkController c = new WorkItemLinkController(linkRepo, itemRepo, rbac, authedUser);

        assertNotFound(() -> c.getLinks("WI-A"));
        assertNotFound(() -> c.createLink("WI-A", Map.of("targetId", "WI-X", "linkType", "BLOCKS")));
        assertNotFound(() -> c.deleteLink("WI-A", 1L));

        verify(linkRepo, never()).save(any());
        verify(linkRepo, never()).deleteById(any());
        verify(linkRepo, never()).findBySourceId(any());
    }

    // ── CustomDashboardController widget endpoints ────────────────────────────
    @Test
    void dashboardWidget_endpoints_denyCrossTenant() {
        DashboardRepository dashRepo = mock(DashboardRepository.class);
        DashboardWidgetRepository widgetRepo = mock(DashboardWidgetRepository.class);
        DashboardLayoutService layout = mock(DashboardLayoutService.class);
        EventService events = mock(EventService.class);
        Dashboard d = new Dashboard();
        d.setWorkspaceId(FOREIGN_WS);
        when(dashRepo.findById("DASH-A")).thenReturn(Optional.of(d));
        CustomDashboardController c =
                new CustomDashboardController(dashRepo, widgetRepo, layout, events, authedUser, rbac);

        assertForbidden(() -> c.addWidget("DASH-A", new DashboardWidget()));
        assertForbidden(() -> c.updateWidget("DASH-A", 1L, new DashboardWidget()));
        assertForbidden(() -> c.deleteWidget("DASH-A", 1L));
        assertForbidden(() -> c.saveLayout("DASH-A", List.of()));

        verify(widgetRepo, never()).save(any());
        verify(widgetRepo, never()).deleteById(any());
    }

    // ── SavedFilterController ─────────────────────────────────────────────────
    @Test
    void savedFilter_endpoints_denyCrossTenant() {
        SavedFilterRepository repo = mock(SavedFilterRepository.class);
        SavedFilter f = new SavedFilter();
        f.setWorkspaceId(FOREIGN_WS);
        when(repo.findById(1L)).thenReturn(Optional.of(f));
        SavedFilterController c = new SavedFilterController(repo, authedUser, rbac);

        assertForbidden(() -> c.toggleShare(1L));
        assertForbidden(() -> c.deleteFilter(1L));

        verify(repo, never()).save(any());
        verify(repo, never()).deleteById(any());
    }

    // ── WorkItemTypeConfigController ──────────────────────────────────────────
    @Test
    void workItemTypeConfig_endpoints_denyCrossTenant() {
        WorkItemTypeConfigRepository repo = mock(WorkItemTypeConfigRepository.class);
        WorkItemTypeConfig existing = new WorkItemTypeConfig();
        existing.setWorkspaceId(FOREIGN_WS);
        when(repo.findById("T-A")).thenReturn(Optional.of(existing));
        WorkItemTypeConfigController c = new WorkItemTypeConfigController(repo, authedUser, rbac);

        WorkItemTypeConfig body = new WorkItemTypeConfig();
        body.setWorkspaceId(FOREIGN_WS);
        assertForbidden(() -> c.create(body));
        assertForbidden(() -> c.update("T-A", new WorkItemTypeConfig()));
        assertForbidden(() -> c.delete("T-A"));

        verify(repo, never()).save(any());
        verify(repo, never()).deleteById(any());
    }

    // ── ReportScheduleController (transitive via report) ──────────────────────
    @Test
    void reportSchedule_endpoints_denyCrossTenant() {
        ReportScheduleRepository schedRepo = mock(ReportScheduleRepository.class);
        ReportScheduleService schedService = mock(ReportScheduleService.class);
        EventService events = mock(EventService.class);
        ReportRepository reportRepo = mock(ReportRepository.class);
        Report report = new Report();
        report.setWorkspaceId(FOREIGN_WS);
        when(reportRepo.findById("R-A")).thenReturn(Optional.of(report));
        ReportSchedule sched = new ReportSchedule();
        sched.setReportId("R-A");
        when(schedRepo.findById("S-A")).thenReturn(Optional.of(sched));
        ReportScheduleController c =
                new ReportScheduleController(schedRepo, schedService, events, authedUser, reportRepo, rbac);

        ReportSchedule body = new ReportSchedule();
        body.setReportId("R-A");
        assertForbidden(() -> c.create(body));
        assertForbidden(() -> c.update("S-A", new ReportSchedule()));
        assertForbidden(() -> c.delete("S-A"));

        verify(schedRepo, never()).save(any());
        verify(schedRepo, never()).deleteById(any());
    }

    // ── PermissionSchemeController (create / delete / createRole) ──────────────
    @Test
    void permissionScheme_mutations_denyCrossTenant() {
        PermissionSchemeRepository schemeRepo = mock(PermissionSchemeRepository.class);
        RoleDefRepository roleDefRepo = mock(RoleDefRepository.class);
        RolePermissionRepository rolePermRepo = mock(RolePermissionRepository.class);
        FieldVisibilityRepository fieldVisRepo = mock(FieldVisibilityRepository.class);
        FieldDefRepository fieldDefRepo = mock(FieldDefRepository.class);
        PermissionSchemeService schemeService = mock(PermissionSchemeService.class);
        PermissionScheme scheme = new PermissionScheme();
        scheme.setWorkspaceId(FOREIGN_WS);
        when(schemeRepo.findById("PS-A")).thenReturn(Optional.of(scheme));
        PermissionSchemeController c = new PermissionSchemeController(
                schemeRepo, roleDefRepo, rolePermRepo, fieldVisRepo, fieldDefRepo,
                authedUser, schemeService, rbac);

        PermissionScheme newScheme = new PermissionScheme();
        newScheme.setWorkspaceId(FOREIGN_WS);
        RoleDef newRole = new RoleDef();
        newRole.setWorkspaceId(FOREIGN_WS);
        assertForbidden(() -> c.create(newScheme));
        assertForbidden(() -> c.delete("PS-A"));
        assertForbidden(() -> c.createRole(newRole));

        verify(schemeRepo, never()).save(any());
        verify(schemeRepo, never()).deleteById(any());
        verify(roleDefRepo, never()).save(any());
    }

    // ── WorkflowController.getStatuses ────────────────────────────────────────
    @Test
    void workflowGetStatuses_deniesCrossTenant() {
        WorkflowRepository wfRepo = mock(WorkflowRepository.class);
        WorkflowStatusRepository statusRepo = mock(WorkflowStatusRepository.class);
        WorkflowTransitionRepository transitionRepo = mock(WorkflowTransitionRepository.class);
        EventService events = mock(EventService.class);
        Workflow wf = new Workflow();
        wf.setWorkspaceId(FOREIGN_WS);
        when(wfRepo.findById("WF-A")).thenReturn(Optional.of(wf));
        WorkflowController c =
                new WorkflowController(wfRepo, statusRepo, transitionRepo, authedUser, rbac, events);

        assertNotFound(() -> c.getStatuses("WF-A"));
        verify(statusRepo, never()).findByWorkflowIdOrderByPosition(any());
    }
}
