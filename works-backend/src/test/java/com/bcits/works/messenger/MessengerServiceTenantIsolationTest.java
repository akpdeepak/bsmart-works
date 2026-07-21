package com.bcits.works.messenger;

import com.bcits.works.auth.RbacService;
import com.bcits.works.shared.ApiException;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

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
 * The messenger endpoints take {@code workspaceId} and {@code channelId} as independent path
 * variables, so authorizing the caller against the workspace they claim proves nothing about the
 * channel they name. A member of their own workspace must not be able to reach a channel owned by
 * another workspace by pairing their own id with a foreign channel id (RB-40 §1).
 */
@Tag("unit")
class MessengerServiceTenantIsolationTest {

    private static final String CALLER = "USR-1";
    private static final String OWN_WORKSPACE = "WS-1";
    private static final String FOREIGN_WORKSPACE = "WS-2";
    private static final String FOREIGN_CHANNEL = "CH-FOREIGN";

    private final ChannelRepository channels = mock(ChannelRepository.class);
    private final MessageRepository messages = mock(MessageRepository.class);
    private final RbacService rbac = mock(RbacService.class);
    private final MessengerService service = new MessengerService(channels, messages, rbac);

    private Channel foreignChannel() {
        Channel c = new Channel();
        c.setId(FOREIGN_CHANNEL);
        c.setWorkspaceId(FOREIGN_WORKSPACE);
        c.setName("finance");
        return c;
    }

    @Test
    void getChannelMessages_refusesAChannelOwnedByAnotherWorkspace() {
        when(channels.findById(FOREIGN_CHANNEL)).thenReturn(Optional.of(foreignChannel()));

        assertThatThrownBy(() -> service.getChannelMessages(CALLER, OWN_WORKSPACE, FOREIGN_CHANNEL))
            .isInstanceOf(ApiException.class);

        verify(messages, never()).findByChannelIdOrderByCreatedAtAsc(any());
    }

    @Test
    void sendMessage_refusesAChannelOwnedByAnotherWorkspace() {
        when(channels.findById(FOREIGN_CHANNEL)).thenReturn(Optional.of(foreignChannel()));

        assertThatThrownBy(() -> service.sendMessage(CALLER, OWN_WORKSPACE, FOREIGN_CHANNEL, "hello"))
            .isInstanceOf(ApiException.class);

        verify(messages, never()).save(any());
    }

    @Test
    void getChannelMessages_refusesAChannelThatDoesNotExist() {
        when(channels.findById("CH-MISSING")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getChannelMessages(CALLER, OWN_WORKSPACE, "CH-MISSING"))
            .isInstanceOf(ApiException.class);

        verify(messages, never()).findByChannelIdOrderByCreatedAtAsc(any());
    }

    @Test
    void getChannelMessages_allowsAChannelOwnedByTheCallersWorkspace() {
        Channel own = new Channel();
        own.setId("CH-OWN");
        own.setWorkspaceId(OWN_WORKSPACE);
        when(channels.findById("CH-OWN")).thenReturn(Optional.of(own));
        Message m = new Message();
        m.setId("MSG-1");
        m.setChannelId("CH-OWN");
        when(messages.findByChannelIdOrderByCreatedAtAsc("CH-OWN")).thenReturn(List.of(m));

        assertThat(service.getChannelMessages(CALLER, OWN_WORKSPACE, "CH-OWN")).containsExactly(m);
    }

    @Test
    void unauthorizedCallerIsRejectedBeforeAnyChannelIsRead() {
        doThrowOnRequire();

        assertThatThrownBy(() -> service.getChannelMessages(CALLER, OWN_WORKSPACE, FOREIGN_CHANNEL))
            .isInstanceOf(ApiException.class);

        verify(messages, never()).findByChannelIdOrderByCreatedAtAsc(any());
    }

    private void doThrowOnRequire() {
        org.mockito.Mockito.doThrow(ApiException.forbidden("no"))
            .when(rbac).require(CALLER, OWN_WORKSPACE, "view_workspace");
    }
}
