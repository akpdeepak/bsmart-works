package com.bcits.works;

import com.bcits.works.auth.RbacController;
import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Tag("unit")
class RbacControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String TARGET = "user-B";
    private static final String WORKSPACE = "ws-A";

    private final RbacService rbac = mock(RbacService.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacController controller = new RbacController(rbac, jdbc, authenticatedUser);

    RbacControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    @Test
    void myRoleUsesRequestedWorkspace() {
        when(rbac.getUserRole(CALLER, WORKSPACE)).thenReturn("ADMIN");
        when(rbac.getUserTier(CALLER, WORKSPACE)).thenReturn(4);
        when(jdbc.queryForList(anyString(), eq(String.class), eq(4))).thenReturn(List.of("view_items"));

        Map<String, Object> result = controller.myRole(WORKSPACE);

        assertThat(result)
                .containsEntry("role", "ADMIN")
                .containsEntry("tier", 4)
                .containsEntry("surfaces", NavSurfaces.visibleFor(4));
        verify(rbac).getUserRole(CALLER, WORKSPACE);
        verify(rbac, never()).getUserRole(eq(CALLER), eq("WS-001"));
    }

    @Test
    void updateRoleRequiresWorkspaceIdInPayload() {
        var response = controller.updateRole(TARGET, Map.of("roleId", "MEMBER"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(jdbc, never()).update(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void updateRoleIsBoundedToPayloadWorkspace() {
        when(rbac.canManageRoles(CALLER, WORKSPACE)).thenReturn(true);
        when(rbac.getUserRole(TARGET, WORKSPACE)).thenReturn("MEMBER");

        var response = controller.updateRole(TARGET, Map.of("roleId", "ADMIN", "workspaceId", WORKSPACE));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(jdbc).update(
                "UPDATE workspace_members SET role_id = ?, system_role = ? WHERE user_id = ? AND workspace_id = ?",
                "ADMIN", "ADMIN", TARGET, WORKSPACE);
        verify(jdbc).update(
                "INSERT INTO role_audit_log (workspace_id, target_user, changed_by, old_role, new_role) VALUES (?,?,?,?,?)",
                WORKSPACE, TARGET, CALLER, "MEMBER", "ADMIN");
    }
}
