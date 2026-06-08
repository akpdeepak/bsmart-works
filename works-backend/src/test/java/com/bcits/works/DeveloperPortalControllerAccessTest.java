package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unauthorized access tests for the Developer Portal API (iteration 20, Cap R — RB-05 Stage 3,
 * RB-40 §1). Reading the SDK requires workspace membership; minting a sandbox credential requires
 * manage_api_tokens. Missing workspace → 400 before any RBAC check.
 */
@Tag("unit")
class DeveloperPortalControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final DeveloperPortalController controller = new DeveloperPortalController(authenticatedUser, rbac);

    DeveloperPortalControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("view_items"));
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("manage_api_tokens"));
    }

    @Test
    void sdk_deniedForNonMember() {
        assertThatThrownBy(() -> controller.sdk(FOREIGN_WS))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void sandboxCredentials_requiresManageApiTokens() {
        assertThatThrownBy(() -> controller.sandboxCredentials(FOREIGN_WS))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void sdk_rejectsMissingWorkspaceId() {
        assertThatThrownBy(() -> controller.sdk(""))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(rbac, never()).require(eq(CALLER), eq(""), eq("view_items"));
    }

    @Test
    void sandboxCredentials_rejectsMissingWorkspaceId() {
        assertThatThrownBy(() -> controller.sandboxCredentials(null))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
