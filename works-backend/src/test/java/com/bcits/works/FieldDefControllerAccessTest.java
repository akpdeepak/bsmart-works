package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

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
 * Cross-tenant access tests for FieldDefController (RB-40 §1, RB-05 Stage 3).
 * FieldDef carries workspaceId directly (Pattern B).
 * A caller whose workspace differs is denied with FORBIDDEN (403) before any mutation runs.
 */
@Tag("unit")
class FieldDefControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";
    private static final String PERM = "view_items";

    private final FieldDefRepository fieldDefRepo = mock(FieldDefRepository.class);
    private final WorkItemFieldValueRepository valueRepo = mock(WorkItemFieldValueRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final org.springframework.jdbc.core.JdbcTemplate jdbc =
            mock(org.springframework.jdbc.core.JdbcTemplate.class);

    private final FieldDefController controller =
            new FieldDefController(fieldDefRepo, valueRepo, authenticatedUser, rbac, jdbc);

    FieldDefControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(PERM));
    }

    private FieldDef fieldDefInForeignWorkspace() {
        FieldDef fd = new FieldDef();
        fd.setId("FD-1");
        fd.setWorkspaceId(FOREIGN_WS);
        fd.setName("Foreign field");
        fd.setFieldType("TEXT");
        return fd;
    }

    @Test
    void get_crossTenantReturnsForbidden() {
        when(fieldDefRepo.findById("FD-1")).thenReturn(Optional.of(fieldDefInForeignWorkspace()));

        assertThatThrownBy(() -> controller.get("FD-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void get_unknownIdReturnsNotFound() {
        when(fieldDefRepo.findById("FD-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.get("FD-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void update_crossTenantReturnsForbidden() {
        when(fieldDefRepo.findById("FD-1")).thenReturn(Optional.of(fieldDefInForeignWorkspace()));

        assertThatThrownBy(() -> controller.update("FD-1", new FieldDef()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(fieldDefRepo, never()).save(any());
    }

    @Test
    void update_unknownIdReturnsNotFound() {
        when(fieldDefRepo.findById("FD-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("FD-missing", new FieldDef()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void delete_crossTenantReturnsForbidden() {
        when(fieldDefRepo.findById("FD-1")).thenReturn(Optional.of(fieldDefInForeignWorkspace()));

        assertThatThrownBy(() -> controller.delete("FD-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(fieldDefRepo, never()).deleteById(any());
    }
}
