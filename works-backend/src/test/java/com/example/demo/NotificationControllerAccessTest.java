package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Ownership tests for marking a notification read (RB-40 §1 / IDOR). A user may only mark their own
 * notification read; another user's id resolves to 404 and is never mutated. Pure mocks.
 */
@Tag("unit")
class NotificationControllerAccessTest {

    private static final String CALLER = "user-A";

    private final NotificationRepository repo = mock(NotificationRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final NotificationController controller = new NotificationController(repo, authenticatedUser);

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
