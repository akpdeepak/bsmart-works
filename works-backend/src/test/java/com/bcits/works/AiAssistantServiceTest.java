package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Behaviour of custom AI assistants (Cap O, iteration 20): persona + remembered context ground the
 * answer, the chat routes through the control plane and writes the exchange back to memory, and
 * tenant scoping is enforced. Pure unit tests (RB-10 §7).
 */
@Tag("unit")
class AiAssistantServiceTest {

    private final AiAssistantRepository assistants = mock(AiAssistantRepository.class);
    private final AiControlPlaneService controlPlane = mock(AiControlPlaneService.class);
    private final AiMemoryService memory = mock(AiMemoryService.class);
    private final EventService events = mock(EventService.class);

    private final AiAssistantService service =
        new AiAssistantService(assistants, controlPlane, memory, events);

    private static final String WS = "WS-001";
    private static final String USER = "USR-001";

    private AiAssistant enabledAssistant() {
        AiAssistant a = new AiAssistant();
        a.setId("AST-1");
        a.setWorkspaceId(WS);
        a.setName("Compliance Assistant");
        a.setPersona("You are the compliance assistant.");
        a.setEnabled(true);
        return a;
    }

    @Test
    void create_rejectsBlankPersona() {
        assertThatThrownBy(() -> service.create(WS, USER, "Name", "desc", " "))
            .isInstanceOf(ApiException.class);
    }

    @Test
    void get_foreignWorkspaceIsNotFound() {
        when(assistants.findByWorkspaceIdAndId(eq("WS-002"), anyString())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get("WS-002", "AST-1")).isInstanceOf(ApiException.class);
    }

    @Test
    void chat_usesAiAnswerAndRemembersExchange() {
        when(assistants.findByWorkspaceIdAndId(WS, "AST-1")).thenReturn(Optional.of(enabledAssistant()));
        when(memory.contextDigest(eq(WS), eq(USER), anyInt())).thenReturn("tone: concise");
        when(controlPlane.invoke(any())).thenReturn(new AiControlPlaneService.AiOutcome(
            true, false, "Your CEA compliance is green.", AiModelTier.SONNET, "ENABLED", 5, false));

        AiAssistantService.ChatReply reply = service.chat(WS, USER, "AST-1", "What is our CEA status?", true);

        assertThat(reply.usedAi()).isTrue();
        assertThat(reply.answer()).isEqualTo("Your CEA compliance is green.");
        assertThat(reply.rememberedContext()).isEqualTo("tone: concise");
        // The exchange is written back to memory (history + last_question).
        verify(memory).remember(eq(WS), eq(USER), eq("AST-1"), eq(AiMemoryService.KIND_HISTORY), anyString(), anyString());
        verify(memory).remember(eq(WS), eq(USER), eq("AST-1"), eq(AiMemoryService.KIND_CONTEXT), eq("last_question"), anyString());
    }

    @Test
    void chat_fallsBackToDeterministicAnswerWhenAiOff() {
        when(assistants.findByWorkspaceIdAndId(WS, "AST-1")).thenReturn(Optional.of(enabledAssistant()));
        when(memory.contextDigest(eq(WS), eq(USER), anyInt())).thenReturn("");
        when(controlPlane.invoke(any())).thenAnswer(inv -> {
            AiControlPlaneService.AiCall c = inv.getArgument(0);
            return new AiControlPlaneService.AiOutcome(false, true, c.draft(), AiModelTier.NONE,
                "DISABLED_WORKSPACE", 0, false);
        });

        AiAssistantService.ChatReply reply = service.chat(WS, USER, "AST-1", "Hello", true);

        assertThat(reply.fallback()).isTrue();
        assertThat(reply.answer()).contains("Compliance Assistant");
        assertThat(reply.answer()).contains("Offline mode");
    }

    @Test
    void chat_disabledAssistantIsRejected() {
        AiAssistant off = enabledAssistant();
        off.setEnabled(false);
        when(assistants.findByWorkspaceIdAndId(WS, "AST-1")).thenReturn(Optional.of(off));
        assertThatThrownBy(() -> service.chat(WS, USER, "AST-1", "Hi", true)).isInstanceOf(ApiException.class);
    }
}
