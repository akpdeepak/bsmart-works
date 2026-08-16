package com.bcits.works;
import com.bcits.works.projects.AssumptionRepository;
import com.bcits.works.projects.PmIssueRepository;
import com.bcits.works.projects.RiskRepository;
import com.bcits.works.messaging.api.ActionItemRepository;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.projects.DependencyRepository;
import com.bcits.works.projects.RaidDashboardController;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant + authorization tests for the RAID dashboard endpoint (RB-40 §1, RB-05 Stage 3).
 *
 * <p>The caller passes only a {@code projectId}; the workspace is resolved from that project via
 * {@link RbacService#workspaceForProject}, then membership + {@code view_items} is proven via
 * {@link RbacService#require}. A non-member is denied with 403 <i>before any RAID query runs</i>
 * (closing the IDOR where a foreign projectId leaked rows), and an unknown project is a 404.
 */
@Tag("unit")
class RaidDashboardControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String OWN_WS = "ws-A";
    private static final String FOREIGN_WS = "ws-B";
    private static final String PERM = "view_items";

    private final RiskRepository riskRepo = mock(RiskRepository.class);
    private final AssumptionRepository assumptionRepo = mock(AssumptionRepository.class);
    private final PmIssueRepository issueRepo = mock(PmIssueRepository.class);
    private final DependencyRepository dependencyRepo = mock(DependencyRepository.class);
    private final ActionItemRepository actionItemRepo = mock(ActionItemRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final RaidDashboardController controller = new RaidDashboardController(
            riskRepo, assumptionRepo, issueRepo, dependencyRepo, actionItemRepo, authenticatedUser, rbac);

    RaidDashboardControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        // The caller is a member of their own workspace, but not the foreign one.
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), anyString());
    }

    @Test
    void foreignProject_isForbidden_beforeAnyQuery() {
        when(rbac.workspaceForProject("PRJ-foreign")).thenReturn(FOREIGN_WS);

        assertThatThrownBy(() -> controller.getDashboard("PRJ-foreign"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(riskRepo, never()).findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(anyString(), anyString());
        verify(assumptionRepo, never()).findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(anyString(), anyString());
        verify(issueRepo, never()).findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(anyString(), anyString());
        verify(dependencyRepo, never()).findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(anyString(), anyString());
        verify(actionItemRepo, never()).findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(anyString(), anyString());
    }

    @Test
    void unknownProject_isNotFound_beforeAnyQuery() {
        when(rbac.workspaceForProject("PRJ-missing")).thenReturn(null);

        assertThatThrownBy(() -> controller.getDashboard("PRJ-missing"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(rbac, never()).require(anyString(), anyString(), anyString());
        verify(riskRepo, never()).findByProjectIdAndWorkspaceIdAndDeletedAtIsNull(anyString(), anyString());
    }

    @Test
    void ownProject_isAuthorized_andQueriesAreWorkspaceBounded() {
        when(rbac.workspaceForProject("PRJ-own")).thenReturn(OWN_WS);
        when(riskRepo.findByProjectIdAndWorkspaceIdAndDeletedAtIsNull("PRJ-own", OWN_WS)).thenReturn(List.of());
        when(assumptionRepo.findByProjectIdAndWorkspaceIdAndDeletedAtIsNull("PRJ-own", OWN_WS)).thenReturn(List.of());
        when(issueRepo.findByProjectIdAndWorkspaceIdAndDeletedAtIsNull("PRJ-own", OWN_WS)).thenReturn(List.of());
        when(dependencyRepo.findByProjectIdAndWorkspaceIdAndDeletedAtIsNull("PRJ-own", OWN_WS)).thenReturn(List.of());
        when(actionItemRepo.findByProjectIdAndWorkspaceIdAndDeletedAtIsNull("PRJ-own", OWN_WS)).thenReturn(List.of());

        var result = controller.getDashboard("PRJ-own");

        // Permission was proven in the resolved workspace, then queries ran bounded to project+workspace.
        verify(rbac).require(CALLER, OWN_WS, PERM);
        verify(riskRepo).findByProjectIdAndWorkspaceIdAndDeletedAtIsNull("PRJ-own", OWN_WS);
        verify(actionItemRepo).findByProjectIdAndWorkspaceIdAndDeletedAtIsNull("PRJ-own", OWN_WS);
        // The old un-scoped query path is never used.
        verify(riskRepo, never()).findByProjectIdAndDeletedAtIsNull(anyString());
        assertThat(result.get("healthScore")).isEqualTo(100);
    }
}
