package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for permission-scheme mutations. Both operations clear-then-rewrite, so the ordering
 * and the "granted defaults to true" rule are the behaviour that matters.
 */
@Tag("unit")
class PermissionSchemeServiceTest {

    private final RoleDefRepository roleDefRepo = mock(RoleDefRepository.class);
    private final RolePermissionRepository rolePermRepo = mock(RolePermissionRepository.class);
    private final PermissionSchemeService service =
            new PermissionSchemeService(roleDefRepo, rolePermRepo);

    @Test
    void deleteRole_removesPermissionsBeforeTheRoleItself() {
        service.deleteRole("ROLE-1");

        InOrder order = inOrder(rolePermRepo, roleDefRepo);
        order.verify(rolePermRepo).deleteByRoleDefId("ROLE-1"); // children first
        order.verify(roleDefRepo).deleteById("ROLE-1");         // then the parent
    }

    @Test
    void setPermissions_clearsExistingBeforeWritingNew() {
        when(rolePermRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.setPermissions("ROLE-1", List.of(Map.of("permission", "view_items")));

        verify(rolePermRepo).deleteByRoleDefId("ROLE-1");
    }

    @Test
    void setPermissions_persistsOneRowPerEntryWithGeneratedIdAndRoleLink() {
        when(rolePermRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<RolePermission> saved = service.setPermissions("ROLE-7", List.of(
                Map.of("permission", "view_items"),
                Map.of("permission", "create_items")));

        assertThat(saved).hasSize(2);
        assertThat(saved).allSatisfy(rp -> {
            assertThat(rp.getId()).startsWith("RP-");
            assertThat(rp.getRoleDefId()).isEqualTo("ROLE-7");
        });
        assertThat(saved).extracting(RolePermission::getPermission)
                .containsExactly("view_items", "create_items");
    }

    @Test
    void setPermissions_grantedDefaultsToTrueWhenOmitted() {
        when(rolePermRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<RolePermission> saved =
                service.setPermissions("ROLE-1", List.of(Map.of("permission", "view_items")));

        assertThat(saved.get(0).getGranted()).isTrue();
    }

    @Test
    void setPermissions_honoursExplicitGrantedFalse() {
        when(rolePermRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<RolePermission> saved = service.setPermissions("ROLE-1",
                List.of(Map.of("permission", "delete_items", "granted", false)));

        assertThat(saved.get(0).getGranted()).isFalse();
    }
}
