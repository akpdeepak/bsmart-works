package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.ai.AiAssistController;
import com.bcits.works.ai.AiAssistService;
import com.bcits.works.ai.AnswerEngineService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

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
 * Unauthorized / cross-tenant access tests for the iteration-11 AI capability endpoints
 * (RB-05 Stage 3, RB-40 §1). A non-member is denied at the boundary before the assist engine runs,
 * so no workspace data is read or mutated across the tenant boundary.
 */
@Tag("unit")
class AiAssistControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final AiAssistService assist = mock(AiAssistService.class);
    private final AnswerEngineService answerEngine = mock(AnswerEngineService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final AiAssistController controller = new AiAssistController(assist, answerEngine, authenticatedUser, rbac);

    AiAssistControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("view_items"));
    }

    @Test
    void parse_deniedForNonMember() {
        assertThatThrownBy(() -> controller.parse(FOREIGN_WS, Map.of("text", "create a bug")))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(assist, never()).parseCommand(anyString(), anyString(), anyString(), anyBoolean());
    }

    @Test
    void execute_deniedForNonMember_nothingExecuted() {
        assertThatThrownBy(() -> controller.execute(FOREIGN_WS, Map.of("steps", java.util.List.of())))
            .isInstanceOf(ApiException.class);
        verify(assist, never()).executePlan(anyString(), anyString(), any());
    }

    @Test
    void triage_deniedForNonMember() {
        assertThatThrownBy(() -> controller.triage(FOREIGN_WS, Map.of("title", "x"))).isInstanceOf(ApiException.class);
        verify(assist, never()).triage(anyString(), anyString(), any(), any(), any(), anyBoolean());
    }

    @Test
    void ask_deniedForNonMember() {
        assertThatThrownBy(() -> controller.ask(FOREIGN_WS, Map.of("question", "x"))).isInstanceOf(ApiException.class);
        verify(answerEngine, never()).ask(anyString(), anyString(), any(), anyBoolean());
    }

    @Test
    void missingWorkspaceIsRejected() {
        assertThatThrownBy(() -> controller.route("", Map.of("text", "x")))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
