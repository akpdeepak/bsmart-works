package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Proves that GET /api/v1/users scopes results to the requested workspace
 * and denies non-members (RB-40 §1 — no cross-tenant user enumeration).
 */
@Tag("unit")
class UserControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String OWN_WS = "ws-A";
    private static final String FOREIGN_WS = "ws-B";

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final UserController controller = new UserController(userRepository, authenticatedUser, rbac);

    UserControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    @Test
    void getAllUsers_memberOfWorkspace_returnsOnlyScopedUsers() {
        when(rbac.getUserTier(CALLER, OWN_WS)).thenReturn(1);
        User member = user("user-B", "Alice", "alice@example.com");
        when(userRepository.findByWorkspaceId(OWN_WS)).thenReturn(List.of(member));

        var result = controller.getAllUsers(OWN_WS);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("id")).isEqualTo("user-B");
        verify(userRepository, never()).findAll();
    }

    @Test
    void getAllUsers_nonMember_throwsNotFound() {
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);

        assertThatThrownBy(() -> controller.getAllUsers(FOREIGN_WS))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Workspace");

        verify(userRepository, never()).findByWorkspaceId(FOREIGN_WS);
        verify(userRepository, never()).findAll();
    }

    @Test
    void getAllUsers_noFindAllCalledForAnyPath() {
        // Regression: ensure findAll() is never called regardless of workspace membership result
        when(rbac.getUserTier(CALLER, OWN_WS)).thenReturn(3);
        when(userRepository.findByWorkspaceId(OWN_WS)).thenReturn(List.of());

        controller.getAllUsers(OWN_WS);

        verify(userRepository, never()).findAll();
    }

    private User user(String id, String fullName, String email) {
        User u = new User();
        u.setId(id);
        u.setFullName(fullName);
        u.setEmail(email);
        return u;
    }
}
