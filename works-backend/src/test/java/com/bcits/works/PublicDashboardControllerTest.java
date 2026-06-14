package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Behavioural + cross-token-isolation tests for {@link PublicDashboardController} (RB-40 §1,
 * RB-05 Stage 3). The endpoint is unauthenticated and resolves the workspace from the share token
 * itself — never the caller — so the mandatory governance scenarios here are:
 * <ul>
 *   <li><b>happy:</b> a valid token returns its dashboard + an aggregate scoped to <em>that
 *       dashboard's</em> workspace.</li>
 *   <li><b>cross-token / cross-tenant:</b> token for workspace A's dashboard only ever scopes the
 *       aggregate to workspace A — a different token (workspace B) cannot surface A's data, and
 *       the workspace id used in the SQL predicate is the token's, never an attacker-supplied one.</li>
 *   <li><b>error / empty:</b> an unknown, blank, or null token returns 404 and queries nothing.</li>
 * </ul>
 */
@Tag("unit")
class PublicDashboardControllerTest {

    private final DashboardRepository dashboardRepository = mock(DashboardRepository.class);
    private final DashboardWidgetRepository widgetRepository = mock(DashboardWidgetRepository.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    private final PublicDashboardController controller =
            new PublicDashboardController(dashboardRepository, widgetRepository, jdbc);

    private static final String WS_A = "WS-A";
    private static final String WS_B = "WS-B";
    private static final String TOKEN_A = "tokenA";
    private static final String TOKEN_B = "tokenB";

    private Dashboard dashboard(String id, String workspaceId, String token) {
        Dashboard d = new Dashboard();
        d.setId(id);
        d.setWorkspaceId(workspaceId);
        d.setName("Dashboard " + id);
        d.setLayoutCols(12);
        d.setShareToken(token);
        return d;
    }

    // The controller passes its params array into JdbcTemplate's Object... varargs, so the bound
    // workspace id arrives as a single trailing vararg — match it as one Object argument.
    @SuppressWarnings("unchecked")
    private void stubAggregateQueries(long count) {
        when(jdbc.queryForObject(contains("COUNT(*)"), eq(Long.class), any(Object.class)))
                .thenReturn(count);
        when(jdbc.query(any(String.class), any(RowMapper.class), any(Object.class)))
                .thenReturn(List.of());
    }

    @Test
    void validToken_returnsDashboardScopedToItsOwnWorkspace() {
        Dashboard dA = dashboard("DSH-A", WS_A, TOKEN_A);
        when(dashboardRepository.findByShareToken(TOKEN_A)).thenReturn(Optional.of(dA));
        when(widgetRepository.findByDashboardIdOrderByPositionAsc("DSH-A")).thenReturn(List.of());
        stubAggregateQueries(7L);

        ResponseEntity<Map<String, Object>> res = controller.getByToken(TOKEN_A);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().get("name")).isEqualTo("Dashboard DSH-A");

        // The aggregate's COUNT must be parameterised with WORKSPACE A (from the token), never a
        // caller-supplied value — proving the scope follows the token (RB-40 §1).
        verify(jdbc).queryForObject(contains("COUNT(*)"), eq(Long.class), eq(WS_A));
    }

    @Test
    void differentToken_scopesToItsOwnWorkspace_notAnotherTenants() {
        Dashboard dB = dashboard("DSH-B", WS_B, TOKEN_B);
        when(dashboardRepository.findByShareToken(TOKEN_B)).thenReturn(Optional.of(dB));
        when(widgetRepository.findByDashboardIdOrderByPositionAsc("DSH-B")).thenReturn(List.of());
        stubAggregateQueries(3L);

        controller.getByToken(TOKEN_B);

        // Token B can only ever scope to workspace B — it can never surface workspace A's rows.
        verify(jdbc).queryForObject(contains("COUNT(*)"), eq(Long.class), eq(WS_B));
    }

    @Test
    void unknownToken_returnsNotFound_andQueriesNothing() {
        when(dashboardRepository.findByShareToken("nope")).thenReturn(Optional.empty());

        ResponseEntity<Map<String, Object>> res = controller.getByToken("nope");

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(jdbc, never()).queryForObject(any(String.class), eq(Long.class), any(Object.class));
    }

    @Test
    void blankOrNullToken_returnsNotFound_withoutTouchingTheRepository() {
        assertThat(controller.getByToken("").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(controller.getByToken("   ").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(controller.getByToken(null).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(dashboardRepository, never()).findByShareToken(any());
    }
}
