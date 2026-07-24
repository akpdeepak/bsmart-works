package com.bcits.works.service;

import com.bcits.works.ai.api.AiControlPlaneService;
import com.bcits.works.ai.api.AiModelTier;
import com.bcits.works.auth.RbacService;
import com.bcits.works.messaging.api.ChatAiDraft;
import com.bcits.works.messaging.api.ChatAiDraftRepository;
import com.bcits.works.messaging.api.ChatConversation;
import com.bcits.works.messaging.api.ChatConversationRepository;
import com.bcits.works.messaging.api.ChatMessage;
import com.bcits.works.messaging.api.ChatMessageRepository;
import com.bcits.works.messaging.api.NotificationBatchService;
import com.bcits.works.security.api.CustomerAttributionPiiService;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;

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
    private final ChatAiDraftRepository drafts = mock(ChatAiDraftRepository.class);
    private final AiControlPlaneService cp = mock(AiControlPlaneService.class);
    private final EventService events = mock(EventService.class);
    private final RbacService rbac = mock(RbacService.class);
    private final NotificationBatchService notificationBatch = mock(NotificationBatchService.class);
    private final CustomerAttributionPiiService attributionPii = mock(CustomerAttributionPiiService.class);

    private final SupportChatService service =
        new SupportChatService(conversations, messages, drafts, cp, events, rbac, notificationBatch, attributionPii);

    private void aiOn() {
        when(cp.invoke(any())).thenAnswer(i -> {
            AiControlPlaneService.AiCall c = i.getArgument(0);
            return new AiControlPlaneService.AiOutcome(true, false, c.draft(), AiModelTier.HAIKU, "ENABLED", 1, false);
        });
        // The repos echo what is saved so the service can re-read the in-flight conversation.
        when(conversations.save(any())).thenAnswer(i -> i.getArgument(0));
        when(messages.save(any())).thenAnswer(i -> i.getArgument(0));
        when(drafts.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private void aiFallback() {
        when(cp.invoke(any())).thenReturn(AiControlPlaneService.AiOutcome.fallback("DISABLED_WORKSPACE"));
        when(conversations.save(any())).thenAnswer(i -> i.getArgument(0));
        when(messages.save(any())).thenAnswer(i -> i.getArgument(0));
        when(drafts.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    /** An OPEN conversation the caller's workspace owns, with a PENDING draft waiting on it. */
    private ChatAiDraft givenPendingDraft(String conversationId, String body) {
        when(conversations.save(any())).thenAnswer(i -> i.getArgument(0));
        when(messages.save(any())).thenAnswer(i -> i.getArgument(0));
        when(drafts.save(any())).thenAnswer(i -> i.getArgument(0));
        ChatConversation convo = new ChatConversation();
        convo.setId(conversationId);
        convo.setWorkspaceId("ws");
        convo.setStatus("OPEN");
        when(conversations.findByWorkspaceIdAndId("ws", conversationId)).thenReturn(Optional.of(convo));

        ChatAiDraft draft = new ChatAiDraft();
        draft.setId("DRAFT-1");
        draft.setWorkspaceId("ws");
        draft.setConversationId(conversationId);
        draft.setBody(body);
        draft.setAiMeta("ENABLED:HAIKU");
        draft.setStatus("PENDING");
        when(drafts.findByWorkspaceIdAndId("ws", "DRAFT-1")).thenReturn(Optional.of(draft));
        when(drafts.findByConversationIdAndStatusOrderByCreatedAtAsc(conversationId, "PENDING"))
            .thenReturn(List.of(draft));
        return draft;
    }

    @Test
    void startConversation_aiOn_holdsTheTier1ReplyAsAPendingDraft() {
        aiOn();
        service.startConversation("ws", "ACC-1", "cust-1", "Asha", null, "my bill seems wrong");

        org.mockito.ArgumentCaptor<ChatAiDraft> saved = org.mockito.ArgumentCaptor.forClass(ChatAiDraft.class);
        verify(drafts).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo("PENDING");
        assertThat(saved.getValue().getBody()).contains("Billing");
        assertThat(saved.getValue().getAiMeta()).contains("ENABLED");
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
        // A draft is still prepared for whichever agent picks the thread up — but nothing was sent.
        verify(drafts).save(any());
        assertThat(persistedAiTurns()).isEmpty();
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
            eq("ws"),
            eq("user-1"),
            eq("CHAT_ESCALATED"),
            contains("Billing help"),
            contains("/support/inbox/"));
    }

    // ── AI guardrail: no customer-visible AI turn without human approval ──────────
    // The transformation roadmap allows AI to draft and "prepare actions for review" but forbids it
    // from automatically sending customer-visible messages. chat_messages *is* the customer
    // transcript, so nothing with senderType AI may be persisted there by the auto-responder.

    /** Every AI turn the service persisted into the customer transcript. */
    private List<ChatMessage> persistedAiTurns() {
        org.mockito.ArgumentCaptor<ChatMessage> saved = org.mockito.ArgumentCaptor.forClass(ChatMessage.class);
        verify(messages, org.mockito.Mockito.atLeast(0)).save(saved.capture());
        return saved.getAllValues().stream().filter(m -> "AI".equals(m.getSenderType())).toList();
    }

    @Test
    void startConversation_aiOn_doesNotSendAiReplyToTheCustomer() {
        aiOn();
        var result = service.startConversation("ws", "ACC-1", "cust-1", "Asha", null, "my bill seems wrong");

        // Only the customer's own turn reaches the transcript — the AI answer is held for review.
        assertThat(result.newMessages()).extracting(ChatMessage::getSenderType).containsExactly("CUSTOMER");
        assertThat(persistedAiTurns()).isEmpty();
        assertThat(result.conversation().getStatus()).isNotEqualTo("AI_HANDLED");
    }

    @Test
    void postCustomerMessage_aiOn_doesNotSendAiReplyToTheCustomer() {
        aiOn();
        ChatConversation convo = new ChatConversation();
        convo.setId("CHAT-3");
        convo.setWorkspaceId("ws");
        convo.setStatus("OPEN");
        when(conversations.findByWorkspaceIdAndId("ws", "CHAT-3")).thenReturn(Optional.of(convo));

        var result = service.postCustomerMessage("ws", "CHAT-3", "cust-1", "any update on my meter reading?");

        assertThat(result.newMessages()).extracting(ChatMessage::getSenderType).containsExactly("CUSTOMER");
        assertThat(persistedAiTurns()).isEmpty();
    }

    @Test
    void aiOn_stillInvokesTheControlPlaneSoTheInvocationIsAudited() {
        // Holding the reply for review must not bypass the AI Control Plane: scope, budget and the
        // AiControlPlaneService.record() audit row still apply to every draft generated (RB-40 §2).
        aiOn();
        service.startConversation("ws", "ACC-1", "cust-1", "Asha", null, "my bill seems wrong");
        verify(cp).invoke(any());
    }

    // ── the approval gate itself ──────────────────────────────────────────────────

    @Test
    void approveDraft_isTheOnlyPathThatMakesAnAiReplyCustomerVisible() {
        ChatAiDraft draft = givenPendingDraft("CHAT-4", "Here is how to read your meter.");

        var result = service.approveDraft("ws", "agent-7", "CHAT-4", "DRAFT-1", null);

        assertThat(result.newMessages()).hasSize(1);
        ChatMessage sent = result.newMessages().get(0);
        assertThat(sent.getSenderType()).isEqualTo("AI");
        assertThat(sent.getBody()).isEqualTo("Here is how to read your meter.");
        // The approving agent is on the record — an AI turn is never unattributed once sent.
        assertThat(sent.getSenderId()).isEqualTo("agent-7");
        assertThat(sent.getAiMeta()).contains("approved");
        assertThat(draft.getStatus()).isEqualTo("APPROVED");
        assertThat(draft.getDecidedBy()).isEqualTo("agent-7");
        assertThat(result.conversation().getStatus()).isEqualTo("AI_HANDLED");
    }

    @Test
    void approveDraft_sendsTheAgentsEditsRatherThanTheAiText() {
        givenPendingDraft("CHAT-4", "Here is how to read your meter.");

        var result = service.approveDraft("ws", "agent-7", "CHAT-4", "DRAFT-1",
            "Here is how to read your meter — and I've credited the disputed unit.");

        assertThat(result.newMessages().get(0).getBody()).contains("credited the disputed unit");
    }

    @Test
    void discardDraft_neverPersistsTheAiReply() {
        ChatAiDraft draft = givenPendingDraft("CHAT-4", "Unhelpful boilerplate.");

        service.discardDraft("ws", "agent-7", "CHAT-4", "DRAFT-1");

        assertThat(draft.getStatus()).isEqualTo("DISCARDED");
        assertThat(persistedAiTurns()).isEmpty();
    }

    @Test
    void approveDraft_rejectsADraftThatWasAlreadyDecided() {
        ChatAiDraft draft = givenPendingDraft("CHAT-4", "Already handled.");
        draft.setStatus("DISCARDED");

        assertThatThrownBy(() -> service.approveDraft("ws", "agent-7", "CHAT-4", "DRAFT-1", null))
            .isInstanceOf(ApiException.class);
        assertThat(persistedAiTurns()).isEmpty();
    }

    @Test
    void postCustomerMessage_reopensAResolvedThreadDurably() {
        // The drafting path no longer ends in a status write, so the reopen must be persisted here.
        aiOn();
        ChatConversation convo = new ChatConversation();
        convo.setId("CHAT-7");
        convo.setWorkspaceId("ws");
        convo.setStatus("RESOLVED");
        when(conversations.findByWorkspaceIdAndId("ws", "CHAT-7")).thenReturn(Optional.of(convo));

        var result = service.postCustomerMessage("ws", "CHAT-7", "cust-1", "this is happening again");

        assertThat(result.conversation().getStatus()).isEqualTo("OPEN");
        verify(conversations, org.mockito.Mockito.atLeastOnce())
            .save(org.mockito.ArgumentMatchers.argThat(c -> "OPEN".equals(c.getStatus())));
    }

    @Test
    void postCustomerMessage_supersedesAStaleDraftInsteadOfLeavingItApprovable() {
        aiOn();
        ChatAiDraft stale = givenPendingDraft("CHAT-5", "Answer to the previous question.");

        service.postCustomerMessage("ws", "CHAT-5", "cust-1", "actually my question is about my bill");

        // The old draft can no longer be approved, and a fresh one was written for the new message.
        assertThat(stale.getStatus()).isEqualTo("SUPERSEDED");
        org.mockito.ArgumentCaptor<ChatAiDraft> saved = org.mockito.ArgumentCaptor.forClass(ChatAiDraft.class);
        verify(drafts, org.mockito.Mockito.atLeastOnce()).save(saved.capture());
        assertThat(saved.getAllValues()).anySatisfy(d ->
            assertThat(d.getStatus()).isEqualTo("PENDING"));
    }

    @Test
    void approveDraft_crossTenant_notFound() {
        // The draft exists, but the caller's workspace does not own the conversation.
        when(conversations.findByWorkspaceIdAndId("ws-A", "CHAT-4")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.approveDraft("ws-A", "agent-7", "CHAT-4", "DRAFT-1", null))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND));
        assertThat(persistedAiTurns()).isEmpty();
    }

    @Test
    void approveDraft_draftFromAnotherConversation_notFound() {
        // Same tenant, but the draft id belongs to a different thread — it must not be approvable here.
        givenPendingDraft("CHAT-4", "Meant for another conversation.");
        ChatConversation other = new ChatConversation();
        other.setId("CHAT-6");
        other.setWorkspaceId("ws");
        other.setStatus("OPEN");
        when(conversations.findByWorkspaceIdAndId("ws", "CHAT-6")).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> service.approveDraft("ws", "agent-7", "CHAT-6", "DRAFT-1", null))
            .isInstanceOf(ApiException.class);
        assertThat(persistedAiTurns()).isEmpty();
    }

    @Test
    void discardDraft_crossTenant_notFound() {
        when(conversations.findByWorkspaceIdAndId("ws-A", "CHAT-4")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.discardDraft("ws-A", "agent-7", "CHAT-4", "DRAFT-1"))
            .isInstanceOf(ApiException.class);
    }

    @Test
    void pendingDraft_crossTenant_notFound() {
        when(conversations.findByWorkspaceIdAndId("ws-A", "CHAT-4")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.pendingDraft("ws-A", "CHAT-4"))
            .isInstanceOf(ApiException.class);
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
