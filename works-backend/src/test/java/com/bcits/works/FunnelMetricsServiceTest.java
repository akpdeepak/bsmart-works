package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link FunnelMetricsService} — admin gate (RB-40 §1 / HEART-METRICS.md §7)
 * and funnel metric computation. Pure mocks; no Spring context, no DB.
 */
@Tag("unit")
class FunnelMetricsServiceTest {

    private final RbacService rbac = mock(RbacService.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    private final FunnelMetricsService service = new FunnelMetricsService(rbac, jdbc);

    // ── Admin gate ────────────────────────────────────────────────────────────

    @Test
    void nonMember_sees404() {
        when(rbac.getUserTier("USR-OUT", "WS-001")).thenReturn(0);

        assertThatThrownBy(() -> service.heartMetrics("USR-OUT", "WS-001"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void member_nonAdmin_sees403() {
        when(rbac.getUserTier("USR-MEM", "WS-001")).thenReturn(2);
        when(rbac.isAdmin("USR-MEM", "WS-001")).thenReturn(false);

        assertThatThrownBy(() -> service.heartMetrics("USR-MEM", "WS-001"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void nullWorkspace_sees404() {
        assertThatThrownBy(() -> service.heartMetrics("USR-ADM", null))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── Metric computation ────────────────────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void heartMetrics_admin_returnsExpectedShape() {
        when(rbac.getUserTier("USR-ADM", "WS-001")).thenReturn(4);
        when(rbac.isAdmin("USR-ADM", "WS-001")).thenReturn(true);

        // totalWorkspaces
        when(jdbc.queryForObject(contains("COUNT(*) FROM workspaces"), any(Class.class))).thenReturn(10);

        // funnel step counts
        when(jdbc.queryForList(contains("event_type"), any(Object[].class))).thenReturn(List.of(
                Map.of("event_type", "WORKSPACE_TEMPLATE_APPLIED", "ws_count", 7L),
                Map.of("event_type", "WORKSPACE_FIRST_VALUE",      "ws_count", 5L),
                Map.of("event_type", "WORKSPACE_TEAMMATE_INVITED", "ws_count", 4L),
                Map.of("event_type", "WORKSPACE_DAY_2_RETURN",     "ws_count", 3L)
        ));

        // first-value 7d and engagement counts
        when(jdbc.queryForObject(contains("INTERVAL '7 days'"), any(Class.class))).thenReturn(4);
        when(jdbc.queryForObject(contains("INTERVAL '1 day'"), any(Class.class), any(Object[].class))).thenReturn(120L);

        Map<String, Object> result = service.heartMetrics("USR-ADM", "WS-001");

        assertThat(result).containsKey("totalWorkspaces");
        assertThat((Integer) result.get("totalWorkspaces")).isEqualTo(10);

        List<Map<String, Object>> steps = (List<Map<String, Object>>) result.get("funnelSteps");
        assertThat(steps).hasSize(4);
        assertThat(steps.get(0)).containsEntry("step", 2).containsEntry("name", "Template applied").containsEntry("count", 7);
        assertThat(steps.get(1)).containsEntry("step", 3).containsEntry("name", "First value").containsEntry("count", 5);

        Map<String, Object> rates = (Map<String, Object>) result.get("rates");
        assertThat(rates).containsKey("firstValueRate7d")
                         .containsKey("templateAdoptionRate")
                         .containsKey("teammateInviteRate")
                         .containsKey("day2ReturnRate");
        // 4 / 10 = 0.4
        assertThat((Double) rates.get("firstValueRate7d")).isEqualTo(0.4);

        assertThat(result).containsKey("engagement");
    }

    @Test
    @SuppressWarnings("unchecked")
    void zeroWorkspaces_ratesAreZero() {
        when(rbac.getUserTier("USR-ADM", "WS-001")).thenReturn(4);
        when(rbac.isAdmin("USR-ADM", "WS-001")).thenReturn(true);
        when(jdbc.queryForObject(contains("COUNT(*) FROM workspaces"), any(Class.class))).thenReturn(0);
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());
        when(jdbc.queryForObject(contains("INTERVAL '7 days'"), any(Class.class))).thenReturn(0);
        when(jdbc.queryForObject(contains("INTERVAL '1 day'"), any(Class.class), any(Object[].class))).thenReturn(0L);

        Map<String, Object> result = service.heartMetrics("USR-ADM", "WS-001");

        Map<String, Object> rates = (Map<String, Object>) result.get("rates");
        assertThat((Double) rates.get("firstValueRate7d")).isZero();
        assertThat((Double) rates.get("templateAdoptionRate")).isZero();
    }
}
