package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@Tag("unit")
class CockpitDigestServiceTest {

    @Test
    void sprintProgressPct_isElapsedShareClampedTo0And100() {
        LocalDate start = LocalDate.parse("2026-06-01");
        LocalDate end = LocalDate.parse("2026-06-11"); // 10-day window
        assertThat(CockpitDigestService.sprintProgressPct(start, end, LocalDate.parse("2026-06-06"))).isEqualTo(50);
        assertThat(CockpitDigestService.sprintProgressPct(start, end, LocalDate.parse("2026-05-30"))).isZero();
        assertThat(CockpitDigestService.sprintProgressPct(start, end, LocalDate.parse("2026-07-01"))).isEqualTo(100);
        assertThat(CockpitDigestService.sprintProgressPct(null, end, LocalDate.parse("2026-06-06"))).isZero();
    }

    @Test
    @SuppressWarnings("unchecked")
    void rag_redWhenSlaBreachedOrLateDelivery() {
        Map<String, Object> breach = CockpitDigestService.rag(1, 0, 90, 90, 60);
        assertThat(breach.get("status")).isEqualTo("RED");
        assertThat((List<String>) breach.get("reasons")).anyMatch(r -> r.contains("SLA-breached"));

        Map<String, Object> late = CockpitDigestService.rag(0, 0, 90, 40, 70);
        assertThat(late.get("status")).isEqualTo("RED");
        assertThat((List<String>) late.get("reasons")).anyMatch(r -> r.contains("midpoint"));
    }

    @Test
    void rag_amberOnOpenCriticalsOrLowAttendanceOrBehindPace() {
        assertThat(CockpitDigestService.rag(0, 2, 90, 90, 40).get("status")).isEqualTo("AMBER");
        assertThat(CockpitDigestService.rag(0, 0, 55, 90, 40).get("status")).isEqualTo("AMBER");
        assertThat(CockpitDigestService.rag(0, 0, 90, 40, 70).get("status")).isEqualTo("RED"); // 40<50 past mid => RED
        assertThat(CockpitDigestService.rag(0, 0, 90, 55, 80).get("status")).isEqualTo("AMBER"); // 55 < 80-20
    }

    @Test
    @SuppressWarnings("unchecked")
    void rag_greenWhenHealthy() {
        Map<String, Object> green = CockpitDigestService.rag(0, 0, 95, 80, 60);
        assertThat(green.get("status")).isEqualTo("GREEN");
        assertThat((List<String>) green.get("reasons")).anyMatch(r -> r.contains("On track"));
    }

    @Test
    void rag_nullAttendanceIsNotAmber() {
        assertThat(CockpitDigestService.rag(0, 0, null, 90, 30).get("status")).isEqualTo("GREEN");
    }

    @Test
    void jdbcDay_acceptsTimestampTypesReturnedByPostgresDrivers() {
        assertThat(CockpitDigestService.jdbcDay(Timestamp.valueOf("2026-06-17 12:00:00")))
                .isEqualTo(LocalDate.parse("2026-06-17"));
        assertThat(CockpitDigestService.jdbcDay(OffsetDateTime.parse("2026-06-17T12:00:00+05:30")))
                .isEqualTo(LocalDate.parse("2026-06-17"));
        assertThat(CockpitDigestService.jdbcDay(LocalDateTime.parse("2026-06-17T12:00:00")))
                .isEqualTo(LocalDate.parse("2026-06-17"));
    }

    @Test
    void digest_crossTenantProjectReturnsNotFound() {
        RbacService rbac = mock(RbacService.class);
        CockpitDigestService service = new CockpitDigestService(null, null, rbac);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn("ws-B");

        assertThatThrownBy(() -> service.digest("ws-A", "user-A", "PROJ-B"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
