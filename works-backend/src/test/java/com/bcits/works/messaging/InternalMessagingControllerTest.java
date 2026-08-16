package com.bcits.works.messaging;
import com.bcits.works.messaging.api.ActionItem;
import com.bcits.works.messaging.api.ActionItemRepository;
import com.bcits.works.messaging.api.ChatConversation;
import com.bcits.works.messaging.api.ChatConversationRepository;
import com.bcits.works.messaging.api.ChatMessage;
import com.bcits.works.messaging.api.ChatMessageRepository;
import com.bcits.works.messaging.api.ConversationParticipantRepository;
import com.bcits.works.messaging.api.MessageReactionRepository;
import com.bcits.works.messaging.api.MessageReadRepository;
import com.bcits.works.messaging.api.PinnedMessageRepository;

import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.RbacGate;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
                new InternalMessagingController(conversationRepo, messageRepo,
                        mock(ConversationParticipantRepository.class),
                        mock(MessageReactionRepository.class),
                        mock(MessageReadRepository.class),
                        mock(PinnedMessageRepository.class),
                        authUser, rbac,
                        new MessageArtifactService(mock(ActionItemRepository.class), mock(DecisionRepository.class)),
                        mock(MessagingAiService.class));

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
                conversationRepo, messageRepo,
                mock(ConversationParticipantRepository.class),
                mock(MessageReactionRepository.class),
                mock(MessageReadRepository.class),
                mock(PinnedMessageRepository.class),
                authUser, rbac, messageArtifacts,
                mock(MessagingAiService.class));

        Map<String, String> payload = new HashMap<>();
        payload.put("body", "/task fix the bug");

        ChatMessage result = controller.sendMessage("c-1", "ws-1", payload);

        assertThat(result.getArtifactType()).isEqualTo("TASK");
        assertThat(result.getArtifactRef()).startsWith("ACT-");   // real ActionItem id, not a placeholder
        assertThat(result.getBody()).isEqualTo("/task fix the bug");
        verify(actionItems).save(any(ActionItem.class));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // EPIC-9 full-scope RED tests — these will fail until the participant,
    // reaction, read-receipt, pin, and AI endpoints are implemented.
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Cross-tenant guard (RB-40 §1): a caller who holds work_write in ws-1 must
     * not be able to add a participant to a conversation that belongs to ws-2.
     * The controller must throw NOT_FOUND (treating another tenant's conversation
     * as non-existent) rather than leaking its existence.
     */
    @Test
    void addParticipant_crossTenantDenied() {
        ChatConversationRepository conversationRepo = mock(ChatConversationRepository.class);
        ChatMessageRepository messageRepo = mock(ChatMessageRepository.class);
        ConversationParticipantRepository participantRepo = mock(ConversationParticipantRepository.class);
        MessageReactionRepository reactionRepo = mock(MessageReactionRepository.class);
        MessageReadRepository readRepo = mock(MessageReadRepository.class);
        PinnedMessageRepository pinRepo = mock(PinnedMessageRepository.class);
        AuthenticatedUser authUser = mock(AuthenticatedUser.class);
        RbacGate rbac = mock(RbacGate.class);

        when(authUser.id()).thenReturn("u-1");

        // Conversation belongs to ws-2; caller is authorized in ws-1.
        ChatConversation otherTenantConv = new ChatConversation();
        otherTenantConv.setId("c-other");
        otherTenantConv.setWorkspaceId("ws-2");
        when(conversationRepo.findById("c-other")).thenReturn(Optional.of(otherTenantConv));

        InternalMessagingController controller = new InternalMessagingController(
                conversationRepo, messageRepo, participantRepo, reactionRepo, readRepo, pinRepo,
                authUser, rbac,
                new MessageArtifactService(mock(ActionItemRepository.class), mock(DecisionRepository.class)),
                mock(MessagingAiService.class));

        // Caller holds work_write in ws-1, but the conversation is in ws-2 → NOT_FOUND
        assertThatThrownBy(() -> controller.addParticipant("c-other", "ws-1", Map.of("userId", "u-2")))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("not found");
    }

    /**
     * AI summarize endpoint must return a deterministic fallback (not throw) when
     * the AI service is unavailable (RB-40 §2 fallback contract).
     */
    @Test
    void summarizeConversation_deterministicFallbackWhenAiOff() {
        ChatConversationRepository conversationRepo = mock(ChatConversationRepository.class);
        ChatMessageRepository messageRepo = mock(ChatMessageRepository.class);
        ConversationParticipantRepository participantRepo = mock(ConversationParticipantRepository.class);
        MessageReactionRepository reactionRepo = mock(MessageReactionRepository.class);
        MessageReadRepository readRepo = mock(MessageReadRepository.class);
        PinnedMessageRepository pinRepo = mock(PinnedMessageRepository.class);
        AuthenticatedUser authUser = mock(AuthenticatedUser.class);
        RbacGate rbac = mock(RbacGate.class);
        MessagingAiService aiService = mock(MessagingAiService.class);

        when(authUser.id()).thenReturn("u-1");

        ChatConversation conv = new ChatConversation();
        conv.setId("c-1");
        conv.setWorkspaceId("ws-1");
        conv.setSubject("Release planning");
        when(conversationRepo.findById("c-1")).thenReturn(Optional.of(conv));

        // Two messages in the conversation
        ChatMessage m1 = new ChatMessage();
 m1.setId("m-1");
 m1.setBody("Let's ship next Friday.");
 m1.setSenderType("AGENT");
        ChatMessage m2 = new ChatMessage();
 m2.setId("m-2");
 m2.setBody("Agreed, I'll update the milestone.");
 m2.setSenderType("AGENT");
        when(messageRepo.findByConversationIdOrderByCreatedAtAsc("c-1")).thenReturn(List.of(m1, m2));

        // AI service returns empty (unavailable / budget exhausted)
        when(aiService.summarize(anyString(), anyString(), any())).thenReturn(null);

        InternalMessagingController controller = new InternalMessagingController(
                conversationRepo, messageRepo, participantRepo, reactionRepo, readRepo, pinRepo,
                authUser, rbac,
                new MessageArtifactService(mock(ActionItemRepository.class), mock(DecisionRepository.class)),
                aiService);

        Map<String, Object> result = controller.summarizeConversation("c-1", "ws-1");

        // Must not be null and must carry a non-empty summary (deterministic fallback)
        assertThat(result).containsKey("summary");
        assertThat((String) result.get("summary")).isNotBlank();
        // Must be flagged as a deterministic fallback so UI can show the correct label
        assertThat(result).containsEntry("aiAvailable", false);
    }

    /**
     * Extract-action-items must return a review-only draft list — not auto-create
     * ActionItems (RB-40 §2.1 human-approval gate).
     */
    @Test
    void extractActions_returnsReviewOnlyDraft() {
        ChatConversationRepository conversationRepo = mock(ChatConversationRepository.class);
        ChatMessageRepository messageRepo = mock(ChatMessageRepository.class);
        ConversationParticipantRepository participantRepo = mock(ConversationParticipantRepository.class);
        MessageReactionRepository reactionRepo = mock(MessageReactionRepository.class);
        MessageReadRepository readRepo = mock(MessageReadRepository.class);
        PinnedMessageRepository pinRepo = mock(PinnedMessageRepository.class);
        AuthenticatedUser authUser = mock(AuthenticatedUser.class);
        RbacGate rbac = mock(RbacGate.class);
        MessagingAiService aiService = mock(MessagingAiService.class);
        ActionItemRepository actionItems = mock(ActionItemRepository.class);

        when(authUser.id()).thenReturn("u-1");

        ChatConversation conv = new ChatConversation();
        conv.setId("c-1");
 conv.setWorkspaceId("ws-1");
        when(conversationRepo.findById("c-1")).thenReturn(Optional.of(conv));

        ChatMessage m1 = new ChatMessage();
 m1.setId("m-1");
 m1.setBody("Alice will write the test plan by Thursday.");
 m1.setSenderType("AGENT");
        when(messageRepo.findByConversationIdOrderByCreatedAtAsc("c-1")).thenReturn(List.of(m1));

        when(aiService.extractActionItems(anyString(), anyString(), any()))
                .thenReturn(List.of(Map.of("title", "Write test plan", "assignee", "Alice", "dueHint", "Thursday")));

        InternalMessagingController controller = new InternalMessagingController(
                conversationRepo, messageRepo, participantRepo, reactionRepo, readRepo, pinRepo,
                authUser, rbac,
                new MessageArtifactService(actionItems, mock(DecisionRepository.class)),
                aiService);

        Map<String, Object> result = controller.extractActionItems("c-1", "ws-1");

        // Drafts must be returned
        assertThat(result).containsKey("drafts");
        // No ActionItem must have been auto-created in the DB
        verify(actionItems, org.mockito.Mockito.never()).save(any());
    }
}
