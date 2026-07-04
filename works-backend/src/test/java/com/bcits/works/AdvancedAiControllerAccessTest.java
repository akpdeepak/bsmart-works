package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unauthorized / cross-tenant access tests for the iteration-20 advanced-AI endpoints (RB-05 Stage
 * 3, RB-40 §1). A non-member is denied at the boundary before any assistant/agent/memory/dashboard
 * service runs, and managing an assistant additionally requires {@code manage_ai}.
 */
@Tag("unit")
class AdvancedAiControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final AiAssistantService assistants = mock(AiAssistantService.class);
    private final AiAgentService agents = mock(AiAgentService.class);
    private final AiMemoryService memory = mock(AiMemoryService.class);
    private final ConversationalDashboardService dashboards = mock(ConversationalDashboardService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final AdvancedAiController controller = new AdvancedAiController(
        assistants, agents, memory, dashboards, authenticatedUser, rbac);

    AdvancedAiControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("view_items"));
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("manage_ai"));
    }

    @Test
    void chat_deniedForNonMember() {
        assertThatThrownBy(() -> controller.chat(FOREIGN_WS, "AST-1",
            new AdvancedAiController.ChatRequest("hi", true))).isInstanceOf(ApiException.class);
        verify(assistants, never()).chat(anyString(), anyString(), anyString(), anyString(), anyBoolean());
    }

    @Test
    void runAgent_deniedForNonMember() {
        assertThatThrownBy(() -> controller.runAgent(FOREIGN_WS,
            new AdvancedAiController.AgentRunRequest("triage everything"))).isInstanceOf(ApiException.class);
        verify(agents, never()).run(anyString(), anyString(), anyString());
    }

    @Test
    void createAssistant_requiresManageAi() {
        assertThatThrownBy(() -> controller.createAssistant(FOREIGN_WS,
            new AdvancedAiController.AssistantRequest("n", "d", "p", null))).isInstanceOf(ApiException.class);
        verify(assistants, never()).create(anyString(), anyString(), any(), any(), any());
    }

    @Test
    void compileDashboard_deniedForNonMember() {
        assertThatThrownBy(() -> controller.compile(FOREIGN_WS,
            new AdvancedAiController.CompileRequest("velocity", true))).isInstanceOf(ApiException.class);
        verify(dashboards, never()).compile(anyString(), anyString(), anyString(), anyBoolean());
    }

    @Test
    void memory_deniedForNonMember() {
        assertThatThrownBy(() -> controller.listMemory(FOREIGN_WS)).isInstanceOf(ApiException.class);
        verify(memory, never()).recall(anyString(), anyString());
    }

    @Test
    void missingWorkspaceIsRejected() {
        assertThatThrownBy(() -> controller.listAssistants("", false))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
