package com.bcits.works;

import com.bcits.works.shared.ApiException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/**
 * Unauthorized / cross-tenant access tests for the Universal Customization Engine API (RB-40 §1). A
 * non-member cannot read another workspace's configuration; a caller without {@code manage_workspace}
 * cannot mutate it, and nothing is persisted when a write is denied.
 */
@Tag("unit")
class ConfigControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final ConfigService config = mock(ConfigService.class);
    private final ConfigImpactService impact = mock(ConfigImpactService.class);
    private final ConfigSerializationService serialization = mock(ConfigSerializationService.class);

    private final ConfigController controller =
            new ConfigController(authenticatedUser, rbac, config, impact, serialization);

    ConfigControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    @Test
    void readSettingsDeniedForNonMember() {
        doThrow(ApiException.forbidden("denied"))
                .when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("view_items"));
        assertThatThrownBy(() -> controller.settings(FOREIGN_WS))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(config, never()).getLive(anyString());
    }

    @Test
    void updateDeniedWithoutManageWorkspace_andNothingPersisted() {
        doThrow(ApiException.forbidden("denied"))
                .when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("manage_workspace"));
        var req = new ConfigController.UpdateRequest("{\"settings\":{}}", "x");
        assertThatThrownBy(() -> controller.updateSettings(FOREIGN_WS, req)).isInstanceOf(ApiException.class);
        verify(config, never()).update(anyString(), anyString(), anyString(), anyInt(), any(), anyString());
    }

    @Test
    void rollbackDeniedWithoutManageWorkspace() {
        doThrow(ApiException.forbidden("denied"))
                .when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("manage_workspace"));
        assertThatThrownBy(() -> controller.rollback(FOREIGN_WS, new ConfigController.RollbackRequest(2)))
                .isInstanceOf(ApiException.class);
        verify(config, never()).rollback(anyString(), anyInt(), anyString(), anyInt());
    }
}
