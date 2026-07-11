package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.projects.BoardController;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

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
 * Unauthorized / cross-tenant access tests for the board configuration API (RB-40 §1). A caller who
 * is not a member of the target workspace cannot read its WIP limits; one without {@code
 * manage_projects} cannot change them, and nothing is persisted when the write is denied.
 */
@Tag("unit")
class BoardControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final BoardWipLimitService wipLimits = mock(BoardWipLimitService.class);

    private final BoardController controller = new BoardController(authenticatedUser, rbac, wipLimits);

    BoardControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    @Test
    void readDeniedForNonMember() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("view_items"));
        assertThatThrownBy(() -> controller.wipLimits(FOREIGN_WS))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(wipLimits, never()).get(FOREIGN_WS);
    }

    @Test
    void writeDeniedWithoutManageProjects_andNothingPersisted() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq("manage_projects"));
        var req = new BoardController.WipLimitsRequest(5, 3, null);
        assertThatThrownBy(() -> controller.setWipLimits(FOREIGN_WS, req)).isInstanceOf(ApiException.class);
        verify(wipLimits, never()).set(anyString(), any(), any(), any());
    }
}
