package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Ownership tests for marking a notification read (RB-40 §1 / IDOR). A user may only mark their own
 * notification read; another user's id resolves to 404 and is never mutated. Pure mocks.
 */
@Tag("unit")
class NotificationControllerAccessTest {

    private static final String CALLER = "user-A";

    private final NotificationRepository repo = mock(NotificationRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final UserPiiService userPii = mock(UserPiiService.class);
    private final NotificationController controller = new NotificationController(repo, authenticatedUser, userPii);

    NotificationControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    @Test
    void markRead_anotherUsersNotification_is404_andNotMutated() {
        Notification other = new Notification();
        other.setUserId("user-B");
        when(repo.findById(9L)).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> controller.markRead(9L))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(repo, never()).save(any());
    }

    @Test
    void markRead_unknown_is404() {
        when(repo.findById(404L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> controller.markRead(404L))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void getNotifications_resolvesActorNameFromVaultAndPrependsToNameFreeMessage() {
        Notification withActor = new Notification();
        withActor.setUserId(CALLER);
        withActor.setActorId("USR-9");
        withActor.setMessage("updated WRK-1 - Fix login");   // name-free as stored (RB-40 §3 Slice 4c)
        Notification systemNote = new Notification();
        systemNote.setUserId(CALLER);
        systemNote.setMessage("SLA breach on WRK-2");          // no actor — unchanged
        when(repo.findByUserId(org.mockito.ArgumentMatchers.eq(CALLER), any()))
                .thenReturn(List.of(withActor, systemNote));
        when(userPii.displayNameById("USR-9")).thenReturn("Alice");

        List<Notification> out = controller.getNotifications(null, 0, 50);

        assertThat(out.get(0).getMessage()).isEqualTo("Alice updated WRK-1 - Fix login");
        assertThat(out.get(1).getMessage()).isEqualTo("SLA breach on WRK-2");
    }

    @Test
    void getNotifications_fallsBackToSomeoneWhenActorUnresolved() {
        Notification n = new Notification();
        n.setUserId(CALLER);
        n.setActorId("USR-GONE");
        n.setMessage("commented on WRK-3");
        when(repo.findByUserId(org.mockito.ArgumentMatchers.eq(CALLER), any())).thenReturn(List.of(n));
        when(userPii.displayNameById("USR-GONE")).thenReturn(null);

        assertThat(controller.getNotifications(null, 0, 50).get(0).getMessage())
                .isEqualTo("Someone commented on WRK-3");
    }

    @Test
    void markRead_ownNotification_succeeds() {
        Notification mine = new Notification();
        mine.setUserId(CALLER);
        when(repo.findById(9L)).thenReturn(Optional.of(mine));
        when(repo.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        Notification result = controller.markRead(9L);

        assertThat(result.isRead()).isTrue();
        verify(repo).save(mine);
    }
}
