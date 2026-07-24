package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.security.api.CustomerAttributionPiiService;
import com.bcits.works.service.SupportChatAgentController;
import com.bcits.works.service.SupportChatService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unauthorized / cross-tenant access tests for the agent-side chat endpoints (RB-05 Stage 3,
 * RB-40 §1). A non-member is denied at the boundary on {@code work_service} before the chat service
 * runs, so no workspace data is read or mutated across the tenant boundary.
 */
@Tag("unit")
class SupportChatAgentControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final SupportChatService chat = mock(SupportChatService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final CustomerAttributionPiiService attributionPii = mock(CustomerAttributionPiiService.class);

    private final SupportChatAgentController controller =
        new SupportChatAgentController(chat, authenticatedUser, rbac, attributionPii);

    SupportChatAgentControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied"))
            .when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("work_service"));
    }

    @Test
    void list_deniedForNonMember() {
        assertThatThrownBy(() -> controller.list(FOREIGN_WS, null))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(chat, never()).listConversations(anyString(), any());
    }

    @Test
    void get_deniedForNonMember() {
        assertThatThrownBy(() -> controller.get("CHAT-1", FOREIGN_WS)).isInstanceOf(ApiException.class);
        verify(chat, never()).getConversationForAgent(anyString(), anyString());
    }

    @Test
    void assign_deniedForNonMember() {
        assertThatThrownBy(() -> controller.assign("CHAT-1", FOREIGN_WS)).isInstanceOf(ApiException.class);
        verify(chat, never()).assign(anyString(), anyString(), anyString());
    }

    @Test
    void reply_deniedForNonMember_nothingPosted() {
        assertThatThrownBy(() -> controller.reply("CHAT-1", FOREIGN_WS, Map.of("body", "hi")))
            .isInstanceOf(ApiException.class);
        verify(chat, never()).agentReply(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void resolve_deniedForNonMember() {
        assertThatThrownBy(() -> controller.resolve("CHAT-1", FOREIGN_WS)).isInstanceOf(ApiException.class);
        verify(chat, never()).resolve(anyString(), anyString(), anyString());
    }

    /**
     * Approving a draft is what turns AI text into a customer-visible message, so a non-member must
     * be stopped at the boundary before the service can append anything.
     */
    @Test
    void approveDraft_deniedForNonMember_nothingSent() {
        assertThatThrownBy(() -> controller.approveDraft("CHAT-1", "DRAFT-1", FOREIGN_WS, null))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(chat, never()).approveDraft(anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void discardDraft_deniedForNonMember() {
        assertThatThrownBy(() -> controller.discardDraft("CHAT-1", "DRAFT-1", FOREIGN_WS))
            .isInstanceOf(ApiException.class);
        verify(chat, never()).discardDraft(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void missingWorkspaceIsRejected() {
        assertThatThrownBy(() -> controller.list("", null))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
