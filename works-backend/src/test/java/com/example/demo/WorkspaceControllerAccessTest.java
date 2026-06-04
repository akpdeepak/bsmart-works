package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * HTTP-surface guard tests for the workspace write paths (RB-40 §1, RB-05 Stage 3).
 *
 * <p>After the I01-S02 refactor (PR #77) RBAC and tenant isolation moved into {@link WorkspaceService}
 * (RB-10 §2); the controller is a thin delegate. The exhaustive cross-tenant / unauthorized cases are
 * proven at the service layer in {@link WorkspaceServiceTest}. These tests prove the remaining
 * controller responsibility: every write delegates under the <em>signed-in caller's</em> identity, and
 * a {@code FORBIDDEN} raised by the service is propagated out of the HTTP layer — never swallowed. Pure
 * unit level — no DB.
 */
@Tag("unit")
class WorkspaceControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";   // a workspace the caller is not a member of

    private final WorkspaceService workspaceService = mock(WorkspaceService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);

    private final WorkspaceController controller =
            new WorkspaceController(workspaceService, authenticatedUser);

    WorkspaceControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call)
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void updateWorkspace_propagatesServiceForbidden_underCallerIdentity() {
        Workspace body = new Workspace();
        body.setName("Renamed");
        doThrow(ApiException.forbidden("denied"))
                .when(workspaceService).updateWorkspace(eq(CALLER), eq(FOREIGN_WS), any());

        assertForbidden(() -> controller.updateWorkspace(FOREIGN_WS, body));
        verify(workspaceService).updateWorkspace(CALLER, FOREIGN_WS, "Renamed");
    }

    @Test
    void addMember_propagatesServiceForbidden_underCallerIdentity() {
        doThrow(ApiException.forbidden("denied"))
                .when(workspaceService).addMember(eq(CALLER), eq(FOREIGN_WS), any(), any());

        assertForbidden(() -> controller.addMember(FOREIGN_WS, Map.of("email", "x@y.com")));
        verify(workspaceService).addMember(CALLER, FOREIGN_WS, "x@y.com", null);
    }

    @Test
    void removeMember_propagatesServiceForbidden_underCallerIdentity() {
        doThrow(ApiException.forbidden("denied"))
                .when(workspaceService).removeMember(CALLER, FOREIGN_WS, "member-1");

        assertForbidden(() -> controller.removeMember(FOREIGN_WS, "member-1"));
        verify(workspaceService).removeMember(CALLER, FOREIGN_WS, "member-1");
    }

    @Test
    void updateBranding_propagatesServiceForbidden_underCallerIdentity() {
        doThrow(ApiException.forbidden("denied"))
                .when(workspaceService).updateBranding(eq(CALLER), eq(FOREIGN_WS), any(), any(), any());

        assertForbidden(() -> controller.updateBranding(FOREIGN_WS, Map.of("primaryColor", "#000000")));
    }
}
