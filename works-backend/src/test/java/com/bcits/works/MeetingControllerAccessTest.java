package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant access tests for MeetingController (RB-40 §1, RB-05 Stage 3).
 * Meeting resolves its workspace via the parent project (Pattern A).
 * A caller outside that workspace receives NOT_FOUND (404) — never the real entity.
 */
@Tag("unit")
class MeetingControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final MeetingRepository meetingRepo = mock(MeetingRepository.class);
    private final MeetingNoteRepository noteRepo = mock(MeetingNoteRepository.class);
    private final ActionItemRepository actionItemRepo = mock(ActionItemRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final MeetingController controller =
            new MeetingController(meetingRepo, noteRepo, actionItemRepo, authenticatedUser, rbac);

    MeetingControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);
    }

    private Meeting meetingInForeignWorkspace() {
        Meeting m = new Meeting();
        m.setId("MTG-1");
        m.setProjectId("PROJ-B");
        m.setTitle("Foreign meeting");
        m.setStatus("SCHEDULED");
        return m;
    }

    @Test
    void get_crossTenantReturnsNotFound() {
        when(meetingRepo.findById("MTG-1")).thenReturn(Optional.of(meetingInForeignWorkspace()));

        assertThatThrownBy(() -> controller.get("MTG-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void get_unknownIdReturnsNotFound() {
        when(meetingRepo.findById("MTG-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.get("MTG-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void update_crossTenantReturnsNotFound() {
        when(meetingRepo.findById("MTG-1")).thenReturn(Optional.of(meetingInForeignWorkspace()));

        assertThatThrownBy(() -> controller.update("MTG-1", new Meeting()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(meetingRepo, never()).save(any());
    }

    @Test
    void update_unknownIdReturnsNotFound() {
        when(meetingRepo.findById("MTG-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("MTG-missing", new Meeting()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void delete_crossTenantReturnsNotFound() {
        when(meetingRepo.findById("MTG-1")).thenReturn(Optional.of(meetingInForeignWorkspace()));

        assertThatThrownBy(() -> controller.delete("MTG-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(meetingRepo, never()).deleteById(any());
    }
}
