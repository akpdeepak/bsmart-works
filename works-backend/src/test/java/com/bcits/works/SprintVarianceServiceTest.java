package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@Tag("unit")
class SprintVarianceServiceTest {

    @Test
    void burndown_burnsPointsOnTheirCompletionDayAndNeverGoesNegative() {
        LocalDate start = LocalDate.parse("2026-06-01");
        Map<LocalDate, Integer> doneByDay = Map.of(
                LocalDate.parse("2026-06-02"), 5,
                LocalDate.parse("2026-06-04"), 8);

        List<Map<String, Object>> curve =
                SprintVarianceService.burndown(start, LocalDate.parse("2026-06-04"), 10, doneByDay);

        assertThat(curve).hasSize(4);
        assertThat(curve.get(0)).containsEntry("remaining", 10); // 06-01
        assertThat(curve.get(1)).containsEntry("remaining", 5);  // 06-02 after 5 pts
        assertThat(curve.get(2)).containsEntry("remaining", 5);  // 06-03 unchanged
        assertThat(curve.get(3)).containsEntry("remaining", 0);  // 06-04 clamped, not -3
    }

    @Test
    void burndown_emptyWhenRangeInvalid() {
        assertThat(SprintVarianceService.burndown(null, LocalDate.now(), 10, Map.of())).isEmpty();
        assertThat(SprintVarianceService.burndown(LocalDate.now(), LocalDate.now().minusDays(1), 10, Map.of()))
                .isEmpty();
    }

    @Test
    void rate_isWholePercentAndZeroSafe() {
        assertThat(SprintVarianceService.rate(1, 3)).isEqualTo(33);
        assertThat(SprintVarianceService.rate(2, 3)).isEqualTo(67);
        assertThat(SprintVarianceService.rate(0, 0)).isZero();
        assertThat(SprintVarianceService.rate(5, 0)).isZero();
    }

    @Test
    void variance_crossTenantSprintReturnsNotFound() {
        SprintRepository sprints = mock(SprintRepository.class);
        RbacService rbac = mock(RbacService.class);
        SprintVarianceService service = new SprintVarianceService(null, sprints, rbac);

        Sprint foreign = new Sprint();
        foreign.setId("SPR-1");
        foreign.setProjectId("PROJ-B");
        when(sprints.findById("SPR-1")).thenReturn(Optional.of(foreign));
        when(rbac.workspaceForProject("PROJ-B")).thenReturn("ws-B");

        assertThatThrownBy(() -> service.variance("ws-A", "user-A", "SPR-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
