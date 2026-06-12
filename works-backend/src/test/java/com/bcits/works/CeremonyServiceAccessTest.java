package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unauthorized + cross-tenant tests for CeremonyService (RB-40 §1, RB-05 Stage 3).
 * The ceremony resolves its workspace from the stored row; a caller outside that
 * workspace receives NOT_FOUND (404) — never the real entity. Running a ceremony
 * (start/complete) requires manage_sprints and is FORBIDDEN (403) for plain members.
 */
@Tag("unit")
class CeremonyServiceAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";
    private static final String HOME_WS = "ws-A";

    private final CeremonySessionRepository sessions = mock(CeremonySessionRepository.class);
    private final CeremonyAttendeeRepository attendance = mock(CeremonyAttendeeRepository.class);
    private final RbacService rbac = mock(RbacService.class);
    private final EventService events = mock(EventService.class);

    private final CeremonyService service = new CeremonyService(sessions, attendance, rbac, events);

    private CeremonySession sessionIn(String wsId, String status) {
        CeremonySession s = new CeremonySession();
        s.setId("CER-1");
        s.setWorkspaceId(wsId);
        s.setProjectId("PROJ-1");
        s.setCeremonyType("RETRO");
        s.setStatus(status);
        return s;
    }

    @Test
    void get_crossTenantReturnsNotFound() {
        when(sessions.findById("CER-1")).thenReturn(Optional.of(sessionIn(FOREIGN_WS, "LIVE")));
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);

        assertThatThrownBy(() -> service.getWithAttendance(CALLER, "CER-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void join_crossTenantReturnsNotFoundAndWritesNothing() {
        when(sessions.findById("CER-1")).thenReturn(Optional.of(sessionIn(FOREIGN_WS, "LIVE")));
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);

        assertThatThrownBy(() -> service.join(CALLER, "CER-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(attendance, never()).save(any());
    }

    @Test
    void schedule_crossTenantProjectReturnsNotFound() {
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);

        CeremonySession in = new CeremonySession();
        in.setProjectId("PROJ-B");
        in.setCeremonyType("PLANNING");

        assertThatThrownBy(() -> service.schedule(CALLER, in, java.util.List.of()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(sessions, never()).save(any());
    }

    @Test
    void start_withoutManageSprintsIsForbidden() {
        when(sessions.findById("CER-1")).thenReturn(Optional.of(sessionIn(HOME_WS, "SCHEDULED")));
        when(rbac.getUserTier(CALLER, HOME_WS)).thenReturn(2);
        doThrow(ApiException.forbidden("You do not have permission to perform this action."))
                .when(rbac).require(CALLER, HOME_WS, "manage_sprints");

        assertThatThrownBy(() -> service.start(CALLER, "CER-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(sessions, never()).save(any());
    }

    @Test
    void join_isOpenToPlainMembersWhileLive() {
        when(sessions.findById("CER-1")).thenReturn(Optional.of(sessionIn(HOME_WS, "LIVE")));
        when(rbac.getUserTier(CALLER, HOME_WS)).thenReturn(1);
        when(attendance.findBySessionIdAndUserId("CER-1", CALLER)).thenReturn(Optional.empty());
        when(attendance.findBySessionIdOrderByJoinedAtAsc("CER-1")).thenReturn(java.util.List.of());

        service.join(CALLER, "CER-1");

        verify(attendance).save(any());
    }

    @Test
    void join_rejectedWhenCeremonyIsNotLive() {
        when(sessions.findById("CER-1")).thenReturn(Optional.of(sessionIn(HOME_WS, "SCHEDULED")));
        when(rbac.getUserTier(CALLER, HOME_WS)).thenReturn(2);

        assertThatThrownBy(() -> service.join(CALLER, "CER-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(attendance, never()).save(any());
    }
}
