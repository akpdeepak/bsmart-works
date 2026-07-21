package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.ai.StructuredExtractionController;
import com.bcits.works.ai.StructuredExtractionService;

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
 * Unauthorized access tests for the structured-extraction endpoint (iteration 20, Cap I —
 * RB-05 Stage 3, RB-40 §1). Any workspace member may run an extraction; a non-member is
 * denied before the service is called. A missing workspaceId → 400.
 */
@Tag("unit")
class StructuredExtractionControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final StructuredExtractionService service = mock(StructuredExtractionService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final StructuredExtractionController controller =
        new StructuredExtractionController(service, authenticatedUser, rbac);

    StructuredExtractionControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("view_items"));
    }

    @Test
    void extract_deniedForNonMember() {
        assertThatThrownBy(() -> controller.extract(FOREIGN_WS, Map.of("text", "hello")))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(service, never()).extract(anyString(), anyString(), anyString(), anyBoolean());
    }

    @Test
    void extract_rejectsMissingWorkspaceId() {
        assertThatThrownBy(() -> controller.extract("", Map.of("text", "hello")))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(rbac, never()).require(any(), any(), any());
    }

    @Test
    void extract_rejectsNullWorkspaceId() {
        assertThatThrownBy(() -> controller.extract(null, Map.of("text", "hello")))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(service, never()).extract(anyString(), anyString(), anyString(), anyBoolean());
    }
}
