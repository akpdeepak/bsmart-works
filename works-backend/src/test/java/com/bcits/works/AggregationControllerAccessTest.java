package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

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
 * Cross-tenant + authorization tests for the Insights aggregation endpoint (RB-40 §1, RB-05 Stage 3).
 *
 * <p>The caller's claimed scope never decides which workspace is read: the workspace is resolved
 * from the project / team (or required explicitly for ORG/PERSONAL), then membership is proven via
 * {@link RbacService#require}. A non-member is denied with 403 <i>before any query runs</i>, and the
 * old "ORG with no workspaceId ⇒ all tenants" hole is gone (now a 400).
 */
@Tag("unit")
class AggregationControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String OWN_WS = "ws-A";
    private static final String FOREIGN_WS = "ws-B";
    private static final String PERM = "view_items";

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final TeamRepository teamRepository = mock(TeamRepository.class);
    private final AggregationService aggregationService = new AggregationService(); // pure, real
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final AggregationController controller = new AggregationController(
            jdbc, teamRepository, aggregationService, authenticatedUser, rbac);

    AggregationControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        // The caller is a member of their own workspace, but not the foreign one.
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(PERM));
    }

    @Test
    void org_withNoWorkspaceId_isRejected_notAllTenants() {
        assertThatThrownBy(() -> controller.aggregate("ORG", null, null, null))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(jdbc, never()).queryForObject(anyString(), eq(Long.class), any(Object[].class));
    }

    @Test
    void org_inForeignWorkspace_isForbidden() {
        assertThatThrownBy(() -> controller.aggregate("ORG", null, null, FOREIGN_WS))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(jdbc, never()).queryForObject(anyString(), eq(Long.class), any(Object[].class));
    }

    @Test
    void project_inForeignWorkspace_isForbidden_beforeAnyQuery() {
        when(rbac.workspaceForProject("PRJ-foreign")).thenReturn(FOREIGN_WS);

        assertThatThrownBy(() -> controller.aggregate("PROJECT", "PRJ-foreign", null, null))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(jdbc, never()).queryForObject(anyString(), eq(Long.class), any(Object[].class));
    }

    @Test
    void project_unknownId_isNotFound() {
        when(rbac.workspaceForProject("PRJ-missing")).thenReturn(null);

        assertThatThrownBy(() -> controller.aggregate("PROJECT", "PRJ-missing", null, null))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void team_inForeignWorkspace_isForbidden() {
        Team foreignTeam = new Team();
        foreignTeam.setId("TEAM-1");
        foreignTeam.setWorkspaceId(FOREIGN_WS);
        foreignTeam.setProjectIds("[\"PRJ-1\"]");
        when(teamRepository.findById("TEAM-1")).thenReturn(Optional.of(foreignTeam));

        assertThatThrownBy(() -> controller.aggregate("TEAM", null, "TEAM-1", null))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(jdbc, never()).queryForObject(anyString(), eq(Long.class), any(Object[].class));
    }

    @Test
    void team_unknownId_isNotFound() {
        when(teamRepository.findById("TEAM-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.aggregate("TEAM", null, "TEAM-missing", null))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void org_inOwnWorkspace_isAuthorized_andBindsWorkspaceFirst() {
        when(jdbc.queryForObject(anyString(), eq(Long.class), any(Object[].class))).thenReturn(3L);

        var result = controller.aggregate("ORG", null, null, OWN_WS);

        assertThat(result.get("scope")).isEqualTo("ORG");
        assertThat(result.get("total")).isEqualTo(3L);
        verify(rbac).require(CALLER, OWN_WS, PERM);
    }
}
