package com.bcits.works;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

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
 * Unauthorized / cross-tenant access tests for the public-API token API (RB-05 Stage 3, RB-40 §1).
 * Every operation — including listing — requires {@code manage_api_tokens}.
 */
@Tag("unit")
class ApiTokenControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final ApiTokenService apiTokens = mock(ApiTokenService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final ApiTokenController controller = new ApiTokenController(apiTokens, authenticatedUser, rbac);

    ApiTokenControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private void deny() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("manage_api_tokens"));
    }

    @Test
    void list_isAdminOnly() {
        deny();
        assertThatThrownBy(() -> controller.list(FOREIGN_WS)).isInstanceOf(ApiException.class);
        verify(apiTokens, never()).list(anyString());
    }

    @Test
    void issue_isAdminOnly() {
        deny();
        assertThatThrownBy(() -> controller.issue(FOREIGN_WS, new ApiTokenController.IssueRequest("x", null)))
            .isInstanceOf(ApiException.class);
        verify(apiTokens, never()).issue(anyString(), anyString(), any(), any());
    }

    @Test
    void revoke_isAdminOnly() {
        deny();
        assertThatThrownBy(() -> controller.revoke(FOREIGN_WS, "TOK-1")).isInstanceOf(ApiException.class);
        verify(apiTokens, never()).revoke(anyString(), anyString());
    }
}
