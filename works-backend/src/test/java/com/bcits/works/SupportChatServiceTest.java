package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Customer chat support (iteration 20, Cap N). The pure FAQ/intent helpers are tested directly; the
 * tier-1 auto-response is tested with a mocked control plane so AI-on vs fallback behaviour — and the
 * escalation paths — are exercised without a database (RB-10 §7). Cross-tenant access is denied.
 */
@Tag("unit")
class SupportChatServiceTest {

    // ── pure tier-1 helpers ──────────────────────────────────────────────────────

    @Test
    void faqAnswer_matchesIntentKeywords() {
        assertThat(SupportChatService.faqAnswer("my bill is too high")).contains("Billing");
        assertThat(SupportChatService.faqAnswer("there is a power outage in my area")).contains("supply");
        assertThat(SupportChatService.faqAnswer("how do I read my meter consumption")).contains("Consumption");
        assertThat(SupportChatService.faqAnswer("I can't login, reset my password")).contains("password");
    }

    @Test
    void faqAnswer_fallsBackToDefaultForUnknownAndBlank() {
        assertThat(SupportChatService.faqAnswer("hello there")).isEqualTo(SupportChatService.FAQ_DEFAULT);
        assertThat(SupportChatService.faqAnswer("")).isEqualTo(SupportChatService.FAQ_DEFAULT);
        assertThat(SupportChatService.faqAnswer(null)).isEqualTo(SupportChatService.FAQ_DEFAULT);
    }

    @Test
    void classifyIntent_returnsCanonicalKey() {
        assertThat(SupportChatService.classifyIntent("payment failed")).isEqualTo("bill");
        assertThat(SupportChatService.classifyIntent("blackout again")).isEqualTo("outage");
        assertThat(SupportChatService.classifyIntent("just saying hi")).isEqualTo("general");
    }

    @Test
    void wantsHuman_detectsEscalationRequests() {
        assertThat(SupportChatService.wantsHuman("can I talk to a human")).isTrue();
        assertThat(SupportChatService.wantsHuman("I want a real person please")).isTrue();
        assertThat(SupportChatService.wantsHuman("speak to someone")).isTrue();
        assertThat(SupportChatService.wantsHuman("what is my balance")).isFalse();
        assertThat(SupportChatService.wantsHuman(null)).isFalse();
    }

    // ── orchestration with a mocked control plane ─────────────────────────────────

    private final ChatConversationRepository conversations = mock(ChatConversationRepository.class);
    private final ChatMessageRepository messages = mock(ChatMessageRepository.class);
    private final AiControlPlaneService cp = mock(AiControlPlaneService.class);
    private final EventService events = mock(EventService.class);
    private final RbacService rbac = mock(RbacService.class);
    private final NotificationBatchService notificationBatch = mock(NotificationBatchService.class);

    private final SupportChatService service =
        new SupportChatService(conversations, messages, cp, events, rbac, notificationBatch);

    private void aiOn() {
        when(cp.invoke(any())).thenAnswer(i -> {
            AiControlPlaneService.AiCall c = i.getArgument(0);
            return new AiControlPlaneService.AiOutcome(true, false, c.draft(), AiModelTier.HAIKU, "ENABLED", 1, false);
        });
        // The repos echo what is saved so the service can re-read the in-flight conversation.
        when(conversations.save(any())).thenAnswer(i -> i.getArgument(0));
        when(messages.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private void aiFallback() {
        when(cp.invoke(any())).thenReturn(AiControlPlaneService.AiOutcome.fallback("DISABLED_WORKSPACE"));
        when(conversations.save(any())).thenAnswer(i -> i.getArgument(0));
        when(messages.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void startConversation_aiOn_postsTier1ReplyAndMarksAiHandled() {
        aiOn();
        var result = service.startConversation("ws", "ACC-1", "cust-1", "Asha", null, "my bill seems wrong");

        // customer message + AI reply.
        assertThat(result.newMessages()).hasSize(2);
        assertThat(result.newMessages().get(0).getSenderType()).isEqualTo("CUSTOMER");
        ChatMessage aiMsg = result.newMessages().get(1);
        assertThat(aiMsg.getSenderType()).isEqualTo("AI");
        assertThat(aiMsg.getBody()).contains("Billing");
        assertThat(aiMsg.getAiMeta()).contains("ENABLED");
        assertThat(result.conversation().getStatus()).isEqualTo("AI_HANDLED");
    }

    @Test
    void startConversation_fallback_escalatesWithHoldingReply() {
        aiFallback();
        var result = service.startConversation("ws", "ACC-1", "cust-1", "Asha", null, "my bill seems wrong");

        ChatMessage aiMsg = result.newMessages().get(1);
        assertThat(aiMsg.getSenderType()).isEqualTo("AI");
        assertThat(aiMsg.getBody()).isEqualTo(SupportChatService.HOLDING_REPLY);
        assertThat(result.conversation().getStatus()).isEqualTo("ESCALATED");
    }

    @Test
    void startConversation_humanRequest_escalatesEvenWhenAiOn() {
        aiOn();
        var result = service.startConversation("ws", "ACC-1", "cust-1", "Asha", null,
            "I'd like to talk to a human agent");
        assertThat(result.conversation().getStatus()).isEqualTo("ESCALATED");
        // The AI still posted a tier-1 reply before handing off.
        assertThat(result.newMessages().get(1).getSenderType()).isEqualTo("AI");
    }

    @Test
    void postCustomerMessage_crossTenant_notFound() {
        // The conversation exists, but not in the caller's workspace.
        when(conversations.findByWorkspaceIdAndId("ws-A", "CHAT-9")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.postCustomerMessage("ws-A", "CHAT-9", "cust-1", "hi"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND));
    }

    @Test
    void getConversation_crossTenant_notFound() {
        when(conversations.findByWorkspaceIdAndId("ws-A", "CHAT-9")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getConversation("ws-A", "CHAT-9"))
            .isInstanceOf(ApiException.class);
    }

    @Test
    void agentReply_escalatesAndTakesOwnership() {
        when(conversations.save(any())).thenAnswer(i -> i.getArgument(0));
        when(messages.save(any())).thenAnswer(i -> i.getArgument(0));
        ChatConversation convo = new ChatConversation();
        convo.setId("CHAT-1");
        convo.setWorkspaceId("ws");
        convo.setStatus("AI_HANDLED");
        when(conversations.findByWorkspaceIdAndId("ws", "CHAT-1")).thenReturn(Optional.of(convo));

        var result = service.agentReply("ws", "agent-7", "CHAT-1", "Hi, I can help with that.");
        assertThat(result.newMessages()).hasSize(1);
        assertThat(result.newMessages().get(0).getSenderType()).isEqualTo("AGENT");
        assertThat(result.conversation().getStatus()).isEqualTo("ESCALATED");
        assertThat(result.conversation().getAssignedAgentId()).isEqualTo("agent-7");
    }

    @Test
    void resolve_setsResolvedStatus() {
        when(conversations.save(any())).thenAnswer(i -> i.getArgument(0));
        ChatConversation convo = new ChatConversation();
        convo.setId("CHAT-1");
        convo.setWorkspaceId("ws");
        convo.setStatus("ESCALATED");
        when(conversations.findByWorkspaceIdAndId("ws", "CHAT-1")).thenReturn(Optional.of(convo));

        ChatConversation resolved = service.resolve("ws", "agent-7", "CHAT-1");
        assertThat(resolved.getStatus()).isEqualTo("RESOLVED");
    }

    @Test
    void escalate_notifiesWorkspaceMembersWithWorkServicePermission() {
        // Arrange: AI fallback triggers escalation; one member has the work_service permission.
        aiFallback();
        when(rbac.getMembersWithPermission("ws", "work_service")).thenReturn(List.of("user-1"));

        // Act: start a conversation — the fallback path escalates and should notify.
        service.startConversation("ws", "ACC-1", "cust-1", "Asha", "Billing help", "my bill seems wrong");

        // Assert: the notification was created exactly once for user-1.
        verify(notificationBatch).createIfNotBatched(
            eq("user-1"),
            eq("CHAT_ESCALATED"),
            contains("Billing help"),
            contains("/support/inbox/"));
    }

    @Test
    void postCustomerMessage_skipsAutoRespondWhenEscalated() {
        // Arrange: an already-escalated conversation — AI should not fire again.
        when(conversations.save(any())).thenAnswer(i -> i.getArgument(0));
        when(messages.save(any())).thenAnswer(i -> i.getArgument(0));
        ChatConversation convo = new ChatConversation();
        convo.setId("CHAT-2");
        convo.setWorkspaceId("ws");
        convo.setStatus("ESCALATED");
        when(conversations.findByWorkspaceIdAndId("ws", "CHAT-2")).thenReturn(Optional.of(convo));

        // Act
        var result = service.postCustomerMessage("ws", "CHAT-2", "cust-1", "Any update?");

        // Assert: only the customer message appended — no AI reply, no control-plane call.
        assertThat(result.newMessages()).hasSize(1);
        assertThat(result.newMessages().get(0).getSenderType()).isEqualTo("CUSTOMER");
        verify(cp, never()).invoke(any());
    }
}
