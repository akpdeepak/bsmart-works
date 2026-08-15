package com.bcits.works;

import com.bcits.works.auth.PermissionSchemeController;
import com.bcits.works.auth.PermissionSchemeRepository;
import com.bcits.works.auth.PermissionSchemeService;
import com.bcits.works.auth.RbacService;
import com.bcits.works.auth.RoleDef;
import com.bcits.works.auth.RoleDefRepository;
import com.bcits.works.auth.RolePermissionRepository;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.FieldVisibility;
import com.bcits.works.shared.FieldVisibilityRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.Optional;

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
 * Access tests for the field-visibility rule surface of PermissionSchemeController (RB-40 §1, FLS
 * Slice 3). These rows ARE the field-level-security control, so authoring/reading them is gated on
 * {@code manage_permissions} for the owning workspace, and a rule cannot pair one tenant's field with
 * another's role. A caller without the permission is denied 403 before any mutation runs.
 */
@Tag("unit")
class PermissionSchemeControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String HOME_WS = "ws-A";     // caller authorized here
    private static final String FOREIGN_WS = "ws-B";  // caller denied here
    private static final String PERM = "manage_permissions";

    private final PermissionSchemeRepository schemeRepo = mock(PermissionSchemeRepository.class);
    private final RoleDefRepository roleDefRepo = mock(RoleDefRepository.class);
    private final RolePermissionRepository rolePermRepo = mock(RolePermissionRepository.class);
    private final FieldVisibilityRepository fieldVisRepo = mock(FieldVisibilityRepository.class);
    private final FieldDefRepository fieldDefRepo = mock(FieldDefRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final PermissionSchemeService permissionSchemeService = mock(PermissionSchemeService.class);
    private final RbacService rbac = mock(RbacService.class);

    private final PermissionSchemeController controller = new PermissionSchemeController(
            schemeRepo, roleDefRepo, rolePermRepo, fieldVisRepo, fieldDefRepo,
            authenticatedUser, permissionSchemeService, rbac);

    PermissionSchemeControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), anyString());
        // rbac.require(CALLER, HOME_WS, PERM) is a no-op (default void mock) → authorized there.
    }

    private RoleDef role(String id, String ws) {
        RoleDef r = new RoleDef();
        r.setId(id);
        r.setWorkspaceId(ws);
        return r;
    }

    private FieldDef field(String id, String ws) {
        FieldDef f = new FieldDef();
        f.setId(id);
        f.setWorkspaceId(ws);
        return f;
    }

    @Test
    void setFieldVisibility_crossTenant_isForbidden_beforeSave() {
        when(roleDefRepo.findById("ROLE-1")).thenReturn(Optional.of(role("ROLE-1", FOREIGN_WS)));
        when(fieldDefRepo.findById("FD-1")).thenReturn(Optional.of(field("FD-1", FOREIGN_WS)));

        assertThatThrownBy(() ->
                controller.setFieldVisibility("FD-1", "ROLE-1", Map.of("visibility", "HIDDEN")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(fieldVisRepo, never()).save(any());
    }

    @Test
    void setFieldVisibility_crossWorkspaceFieldRoleMismatch_isBadRequest() {
        // Authorized on the role's workspace, but the field belongs to a different workspace.
        when(roleDefRepo.findById("ROLE-1")).thenReturn(Optional.of(role("ROLE-1", HOME_WS)));
        when(fieldDefRepo.findById("FD-1")).thenReturn(Optional.of(field("FD-1", FOREIGN_WS)));

        assertThatThrownBy(() ->
                controller.setFieldVisibility("FD-1", "ROLE-1", Map.of("visibility", "HIDDEN")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(fieldVisRepo, never()).save(any());
    }

    @Test
    void setFieldVisibility_sameWorkspaceAuthorized_savesRule() {
        when(roleDefRepo.findById("ROLE-1")).thenReturn(Optional.of(role("ROLE-1", HOME_WS)));
        when(fieldDefRepo.findById("FD-1")).thenReturn(Optional.of(field("FD-1", HOME_WS)));
        when(fieldVisRepo.findByFieldDefIdAndRoleDefId("FD-1", "ROLE-1")).thenReturn(Optional.empty());
        when(fieldVisRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FieldVisibility saved =
                controller.setFieldVisibility("FD-1", "ROLE-1", Map.of("visibility", "HIDDEN"));

        assertThat(saved.getVisibility()).isEqualTo("HIDDEN");
        assertThat(saved.getFieldDefId()).isEqualTo("FD-1");
        verify(fieldVisRepo).save(any());
    }

    @Test
    void getFieldVisibility_crossTenant_isForbidden_beforeRead() {
        when(fieldDefRepo.findById("FD-1")).thenReturn(Optional.of(field("FD-1", FOREIGN_WS)));

        assertThatThrownBy(() -> controller.getFieldVisibility("FD-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(fieldVisRepo, never()).findByFieldDefId(any());
    }

    @Test
    void deleteFieldVisibility_crossTenant_isForbidden_beforeDelete() {
        FieldVisibility fv = new FieldVisibility();
        fv.setId("FV-1");
        fv.setRoleDefId("ROLE-1");
        when(fieldVisRepo.findById("FV-1")).thenReturn(Optional.of(fv));
        when(roleDefRepo.findById("ROLE-1")).thenReturn(Optional.of(role("ROLE-1", FOREIGN_WS)));

        assertThatThrownBy(() -> controller.deleteFieldVisibility("FV-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(fieldVisRepo, never()).deleteById(any());
    }
}
