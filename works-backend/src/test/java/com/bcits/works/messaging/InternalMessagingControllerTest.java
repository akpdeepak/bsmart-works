package com.bcits.works.messaging;

import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@Tag("unit")
public class InternalMessagingControllerTest {

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

        InternalMessagingController controller = new InternalMessagingController(conversationRepo, messageRepo, authUser, rbac);

        Map<String, String> payload = new HashMap<>();
        payload.put("body", "/task fix the bug");
        
        ChatMessage result = controller.sendMessage("c-1", "ws-1", payload);

        assertThat(result.getArtifactType()).isEqualTo("TASK");
        assertThat(result.getArtifactRef()).isNotNull();
        assertThat(result.getBody()).isEqualTo("/task fix the bug");
    }
}
