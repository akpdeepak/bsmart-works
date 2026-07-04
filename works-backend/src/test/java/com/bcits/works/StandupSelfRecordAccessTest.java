package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

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
 * Authorization matrix for the async-first standup self-record (RB-40 §1, RB-05 Stage 3):
 * a member may record THEIR OWN entry without manage_sprints; recording someone else's
 * entry still requires it; callers outside the workspace get NOT_FOUND.
 */
@Tag("unit")
class StandupSelfRecordAccessTest {

    private static final String MEMBER = "user-dev";
    private static final String OTHER = "user-other";
    private static final String HOME_WS = "ws-A";
    private static final String FOREIGN_WS = "ws-B";

    private final StandupSessionRepository sessions = mock(StandupSessionRepository.class);
    private final StandupEntryRepository entries = mock(StandupEntryRepository.class);
    private final RbacService rbac = mock(RbacService.class);
    private final EventService events = mock(EventService.class);

    private final StandupService service = new StandupService(sessions, entries, rbac, events);

    private StandupSession sessionIn(String wsId) {
        StandupSession s = new StandupSession();
        s.setId("STD-1");
        s.setWorkspaceId(wsId);
        s.setProjectId("PROJ-1");
        return s;
    }

    private StandupEntry entryFor(String memberId) {
        StandupEntry e = new StandupEntry();
        e.setId("STE-1");
        e.setSessionId("STD-1");
        e.setMemberId(memberId);
        e.setStatus("PENDING");
        return e;
    }

    @Test
    void member_canRecordOwnEntryWithoutManageSprints() {
        when(sessions.findById("STD-1")).thenReturn(Optional.of(sessionIn(HOME_WS)));
        when(rbac.getUserTier(MEMBER, HOME_WS)).thenReturn(2);
        when(entries.findById("STE-1")).thenReturn(Optional.of(entryFor(MEMBER)));
        when(entries.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StandupEntry saved = service.recordEntry(MEMBER, "STD-1", "STE-1", "y", "t", null);

        assertThat(saved.getStatus()).isEqualTo("RECORDED");
        verify(rbac, never()).require(MEMBER, HOME_WS, "manage_sprints");
    }

    @Test
    void member_recordingAnotherMembersEntryIsForbidden() {
        when(sessions.findById("STD-1")).thenReturn(Optional.of(sessionIn(HOME_WS)));
        when(rbac.getUserTier(MEMBER, HOME_WS)).thenReturn(2);
        when(entries.findById("STE-1")).thenReturn(Optional.of(entryFor(OTHER)));
        doThrow(ApiException.forbidden("You do not have permission to perform this action."))
                .when(rbac).require(MEMBER, HOME_WS, "manage_sprints");

        assertThatThrownBy(() -> service.recordEntry(MEMBER, "STD-1", "STE-1", "y", "t", null))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(entries, never()).save(any());
    }

    @Test
    void facilitator_canStillRecordOthersEntries() {
        when(sessions.findById("STD-1")).thenReturn(Optional.of(sessionIn(HOME_WS)));
        when(rbac.getUserTier("user-lead", HOME_WS)).thenReturn(3);
        when(entries.findById("STE-1")).thenReturn(Optional.of(entryFor(OTHER)));
        when(entries.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StandupEntry saved = service.recordEntry("user-lead", "STD-1", "STE-1", "y", "t", "b");

        assertThat(saved.getStatus()).isEqualTo("RECORDED");
        verify(rbac).require("user-lead", HOME_WS, "manage_sprints");
    }

    @Test
    void crossTenantCallerGetsNotFoundEvenForOwnMemberId() {
        when(sessions.findById("STD-1")).thenReturn(Optional.of(sessionIn(FOREIGN_WS)));
        when(rbac.getUserTier(MEMBER, FOREIGN_WS)).thenReturn(0);

        assertThatThrownBy(() -> service.recordEntry(MEMBER, "STD-1", "STE-1", "y", "t", null))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(entries, never()).save(any());
    }
}
