package com.bcits.works.messaging;

import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Tag("unit")
public class InternalMessagingControllerTest {

    private static ChatConversation conversation(String id, String workspaceId, ConversationType type) {
        ChatConversation c = new ChatConversation();
        c.setId(id);
        c.setWorkspaceId(workspaceId);
        c.setType(type);
        return c;
    }

    /**
     * Cross-tenant regression (RB-40 §1). The internal inbox used to read every conversation row and
     * post-filter only by type, so a caller authorized in one workspace received another tenant's
     * DIRECT threads. The list must narrow to the caller's workspace in the query itself.
     */
    @Test
    void listReturnsOnlyTheCallersWorkspace() {
        ChatConversationRepository conversationRepo = mock(ChatConversationRepository.class);
        ChatMessageRepository messageRepo = mock(ChatMessageRepository.class);
        AuthenticatedUser authUser = mock(AuthenticatedUser.class);
        RbacGate rbac = mock(RbacGate.class);

        when(authUser.id()).thenReturn("u-1");

        // Simulates the table: two tenants, plus a support thread that must stay out of Messenger.
        List<ChatConversation> allRows = List.of(
                conversation("c-mine", "ws-1", ConversationType.DIRECT),
                conversation("c-other-tenant", "ws-2", ConversationType.DIRECT),
                conversation("c-support", "ws-1", ConversationType.SUPPORT));
        when(conversationRepo.findAll()).thenReturn(allRows);
        when(conversationRepo.findByWorkspaceIdAndTypeNotOrderByLastMessageAtDesc(anyString(), any()))
                .thenAnswer(inv -> allRows.stream()
                        .filter(c -> c.getWorkspaceId().equals(inv.getArgument(0)))
                        .filter(c -> c.getType() != inv.<ConversationType>getArgument(1))
                        .toList());

        InternalMessagingController controller =
                new InternalMessagingController(conversationRepo, messageRepo, authUser, rbac,
                        new MessageArtifactService(mock(ActionItemRepository.class), mock(DecisionRepository.class)));

        List<ChatConversation> visible = controller.list("ws-1");

        assertThat(visible).extracting(ChatConversation::getId).containsExactly("c-mine");
        assertThat(visible).extracting(ChatConversation::getWorkspaceId).containsOnly("ws-1");
    }

    @Test
    void testSendMessageWithTaskArtifact() {
        ChatConversationRepository conversationRepo = mock(ChatConversationRepository.class);
        ChatMessageRepository messageRepo = mock(ChatMessageRepository.class);
        AuthenticatedUser authUser = mock(AuthenticatedUser.class);
        RbacGate rbac = mock(RbacGate.class);

        when(authUser.id()).thenReturn("u-1");
        
        ChatConversation convo = new ChatConversation();
        convo.setId("c-1");
        convo.setWorkspaceId("ws-1");
        when(conversationRepo.findById("c-1")).thenReturn(Optional.of(convo));

        when(messageRepo.save(any(ChatMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Real conversion service with a mocked repo: a "/task" creates an actual ActionItem and the
        // message links to its real id (not a throwaway UUID).
        ActionItemRepository actionItems = mock(ActionItemRepository.class);
        when(actionItems.save(any(ActionItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        MessageArtifactService messageArtifacts =
                new MessageArtifactService(actionItems, mock(DecisionRepository.class));
        InternalMessagingController controller = new InternalMessagingController(
                conversationRepo, messageRepo, authUser, rbac, messageArtifacts);

        Map<String, String> payload = new HashMap<>();
        payload.put("body", "/task fix the bug");

        ChatMessage result = controller.sendMessage("c-1", "ws-1", payload);

        assertThat(result.getArtifactType()).isEqualTo("TASK");
        assertThat(result.getArtifactRef()).startsWith("ACT-");   // real ActionItem id, not a placeholder
        assertThat(result.getBody()).isEqualTo("/task fix the bug");
        verify(actionItems).save(any(ActionItem.class));
    }
}
