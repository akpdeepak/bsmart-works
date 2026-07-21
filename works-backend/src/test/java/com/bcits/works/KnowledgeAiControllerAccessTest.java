package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.knowledge.KnowledgeAiController;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unauthorized / cross-tenant access tests for the Know Studio AI compose endpoint (RB-05 Stage 3,
 * RB-40 §1). A non-member is denied at the controller boundary before the service (and therefore the
 * AI Control Plane and any workspace data) is touched. The mandatory missing-workspace rejection is
 * covered too.
 */
@Tag("unit")
class KnowledgeAiControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final KnowledgeAiService service = mock(KnowledgeAiService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final KnowledgeAiController controller =
        new KnowledgeAiController(service, authenticatedUser, rbac);

    KnowledgeAiControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), anyString());
    }

    @Test
    void compose_deniedForNonMember_serviceNotInvoked() {
        assertThatThrownBy(() -> controller.compose(FOREIGN_WS, Map.of("mode", "improve", "text", "hi")))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(service, never()).compose(anyString(), anyString(), anyString(), anyString(), anyString(), anyBoolean());
    }

    @Test
    void compose_missingWorkspace_rejected() {
        assertThatThrownBy(() -> controller.compose("  ", Map.of("mode", "improve", "text", "hi")))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(service, never()).compose(anyString(), anyString(), anyString(), anyString(), anyString(), anyBoolean());
    }
}
