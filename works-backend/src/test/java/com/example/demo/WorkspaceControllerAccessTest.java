package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant / unauthorized access tests for the workspace write paths (RB-40 §1, RB-05 Stage 3).
 *
 * <p>Here the workspace id <em>is</em> the tenant boundary: a caller who is not a member of the
 * target workspace (or lacks the permission) is denied with 403 by {@link RbacService} before any
 * mutation runs. This is the most direct cross-tenant guard in the app — a stranger editing another
 * DISCOM's workspace, members, or branding. Pure unit level — no DB.
 */
@Tag("unit")
class WorkspaceControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";   // a workspace the caller is not a member of

    private final WorkspaceRepository workspaceRepository = mock(WorkspaceRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final EventService eventService = mock(EventService.class);

    // The controller is a thin HTTP layer (I01-S02): it delegates to WorkspaceService, where RBAC
    // is enforced. Wiring a real service through mocked deps keeps this an end-to-end controller
    // test of the cross-tenant write guard — rbac.require(...) still throws 403 before any mutation.
    private final WorkspaceService workspaceService = new WorkspaceService(
            workspaceRepository, userRepository, rbac, eventService, jdbc);

    private final WorkspaceController controller = new WorkspaceController(
            workspaceService, authenticatedUser);

    WorkspaceControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private void denyPermission(String permission) {
        doThrow(ApiException.forbidden("denied"))
                .when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(permission));
    }

    private void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call)
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void updateWorkspace_deniedForNonMember() {
        denyPermission("manage_workspace");
        assertForbidden(() -> controller.updateWorkspace(FOREIGN_WS, new Workspace()));
        verify(workspaceRepository, never()).save(any());
    }

    @Test
    void addMember_deniedForNonMember() {
        denyPermission("invite_members");
        assertForbidden(() -> controller.addMember(FOREIGN_WS, Map.of("email", "x@y.com")));
        verify(jdbc, never()).update(any(String.class), any(), any(), any());
    }

    @Test
    void removeMember_deniedForNonMember() {
        denyPermission("remove_members");
        assertForbidden(() -> controller.removeMember(FOREIGN_WS, "member-1"));
        verify(jdbc, never()).update(any(String.class), any(), any());
    }

    @Test
    void updateBranding_deniedForNonMember() {
        denyPermission("manage_workspace");
        assertForbidden(() -> controller.updateBranding(FOREIGN_WS, Map.of("primaryColor", "#000000")));
    }
}
