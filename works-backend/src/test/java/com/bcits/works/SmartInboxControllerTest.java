package com.bcits.works;

import com.bcits.works.messaging.SmartInboxController;
import com.bcits.works.messaging.SmartInboxService;
import com.bcits.works.shared.AuthenticatedUser;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Tag("unit")
class SmartInboxControllerTest {

    private final SmartInboxService service = mock(SmartInboxService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final SmartInboxController controller = new SmartInboxController(service, authenticatedUser);

    SmartInboxControllerTest() {
        when(authenticatedUser.id()).thenReturn("USR-1");
    }

    @Test
    void listAndCountAlwaysUseAuthenticatedCaller() {
        when(service.list("WS-1", "USR-1")).thenReturn(List.of());
        when(service.count("WS-1", "USR-1")).thenReturn(4L);

        assertThat(controller.list("WS-1")).isEmpty();
        assertThat(controller.count("WS-1")).containsEntry("count", 4L);
        verify(service).list("WS-1", "USR-1");
        verify(service).count("WS-1", "USR-1");
    }

    @Test
    void mutationsCannotChooseAnotherUser() {
        OffsetDateTime until = OffsetDateTime.now().plusHours(1);
        controller.snooze("WS-1", new SmartInboxController.SnoozeRequest("notification:1", until));
        controller.done("WS-1", new SmartInboxController.ItemRequest("notification:1"));
        controller.bulkDone("WS-1", new SmartInboxController.BulkRequest(List.of("notification:2")));

        verify(service).snooze("WS-1", "USR-1", "notification:1", until);
        verify(service).markDone("WS-1", "USR-1", "notification:1");
        verify(service).bulkDoneLowPriority("WS-1", "USR-1", List.of("notification:2"));
    }
}
