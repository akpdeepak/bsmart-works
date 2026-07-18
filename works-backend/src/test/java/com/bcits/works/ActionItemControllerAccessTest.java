package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.messaging.ActionItem;
import com.bcits.works.messaging.ActionItemController;
import com.bcits.works.messaging.ActionItemRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant access tests for ActionItemController (RB-40 §1, RB-05 Stage 3).
 * ActionItem resolves its workspace via the parent project (Pattern A).
 * A caller outside that workspace receives NOT_FOUND (404) — never the real entity.
 */
@Tag("unit")
class ActionItemControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final ActionItemRepository repo = mock(ActionItemRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final ActionItemController controller =
            new ActionItemController(repo, authenticatedUser, rbac);

    ActionItemControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);
    }

    private ActionItem itemInForeignWorkspace() {
        ActionItem item = new ActionItem();
        item.setId("ACT-1");
        item.setProjectId("PROJ-B");
        item.setTitle("Foreign action item");
        item.setStatus("OPEN");
        return item;
    }

    @Test
    void get_crossTenantReturnsNotFound() {
        when(repo.findById("ACT-1")).thenReturn(Optional.of(itemInForeignWorkspace()));

        assertThatThrownBy(() -> controller.get("ACT-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void get_unknownIdReturnsNotFound() {
        when(repo.findById("ACT-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.get("ACT-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void update_crossTenantReturnsNotFound() {
        when(repo.findById("ACT-1")).thenReturn(Optional.of(itemInForeignWorkspace()));

        assertThatThrownBy(() -> controller.update("ACT-1", new ActionItem()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repo, never()).save(any());
    }

    @Test
    void update_unknownIdReturnsNotFound() {
        when(repo.findById("ACT-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("ACT-missing", new ActionItem()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void delete_crossTenantReturnsNotFound() {
        when(repo.findById("ACT-1")).thenReturn(Optional.of(itemInForeignWorkspace()));

        assertThatThrownBy(() -> controller.delete("ACT-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repo, never()).deleteById(any());
    }
}
