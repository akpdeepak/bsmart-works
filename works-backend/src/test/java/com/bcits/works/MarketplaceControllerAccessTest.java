package com.bcits.works;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

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
 * Unauthorized / cross-tenant access tests for the marketplace endpoints (RB-05 Stage 3, RB-40 §1). A
 * non-member is denied at the boundary before the service runs, and a missing workspace is rejected —
 * in both cases the service is never reached, so no catalog write or install crosses a tenant line.
 */
@Tag("unit")
class MarketplaceControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final MarketplaceService marketplace = mock(MarketplaceService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final MarketplaceController controller =
        new MarketplaceController(marketplace, authenticatedUser, rbac);

    MarketplaceControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied"))
            .when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("manage_integrations"));
    }

    @Test
    void install_deniedForNonMember_nothingInstalled() {
        assertThatThrownBy(() -> controller.install(FOREIGN_WS,
                new MarketplaceController.InstallRequest("MKT-1", List.of("read_items"))))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(marketplace, never()).install(anyString(), anyString(), anyString(), any());
    }

    @Test
    void publish_deniedForNonMember() {
        assertThatThrownBy(() -> controller.publish(FOREIGN_WS, new MarketplaceService.ListingInput(
                "slug", "Name", null, null, null, null, null, List.of(), "PUBLISHED")))
            .isInstanceOf(ApiException.class);
        verify(marketplace, never()).publish(anyString(), anyString(), any());
    }

    @Test
    void uninstall_deniedForNonMember() {
        assertThatThrownBy(() -> controller.uninstall(FOREIGN_WS, "EXT-1"))
            .isInstanceOf(ApiException.class);
        verify(marketplace, never()).uninstall(anyString(), anyString(), anyString());
    }

    @Test
    void setEnabled_deniedForNonMember() {
        assertThatThrownBy(() -> controller.setEnabled(FOREIGN_WS, "EXT-1",
                new MarketplaceController.EnabledRequest(false)))
            .isInstanceOf(ApiException.class);
        verify(marketplace, never()).setEnabled(anyString(), anyString(), anyString(), anyBoolean());
    }

    @Test
    void missingWorkspaceIsRejected() {
        assertThatThrownBy(() -> controller.install("",
                new MarketplaceController.InstallRequest("MKT-1", List.of())))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(marketplace, never()).install(anyString(), anyString(), anyString(), any());
    }
}
