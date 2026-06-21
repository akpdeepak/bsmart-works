package com.bcits.works;

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
 * Cross-tenant access tests for StakeholderController (RB-40 §1, RB-05 Stage 3).
 * Stakeholder resolves its workspace via the parent project (Pattern A).
 * A caller outside that workspace receives NOT_FOUND (404) — never the real entity.
 */
@Tag("unit")
class StakeholderControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final StakeholderRepository repo = mock(StakeholderRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final StakeholderPiiService stakeholderPii = mock(StakeholderPiiService.class);

    private final StakeholderController controller =
            new StakeholderController(repo, authenticatedUser, rbac, stakeholderPii);

    StakeholderControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);
    }

    private Stakeholder stakeholderInForeignWorkspace() {
        Stakeholder s = new Stakeholder();
        s.setId("STK-1");
        s.setProjectId("PROJ-B");
        s.setName("Foreign stakeholder");
        return s;
    }

    @Test
    void get_crossTenantReturnsNotFound() {
        when(repo.findById("STK-1")).thenReturn(Optional.of(stakeholderInForeignWorkspace()));

        assertThatThrownBy(() -> controller.get("STK-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void get_unknownIdReturnsNotFound() {
        when(repo.findById("STK-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.get("STK-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void update_crossTenantReturnsNotFound() {
        when(repo.findById("STK-1")).thenReturn(Optional.of(stakeholderInForeignWorkspace()));

        assertThatThrownBy(() -> controller.update("STK-1", new Stakeholder()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repo, never()).save(any());
    }

    @Test
    void update_unknownIdReturnsNotFound() {
        when(repo.findById("STK-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("STK-missing", new Stakeholder()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void delete_crossTenantReturnsNotFound() {
        when(repo.findById("STK-1")).thenReturn(Optional.of(stakeholderInForeignWorkspace()));

        assertThatThrownBy(() -> controller.delete("STK-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repo, never()).deleteById(any());
    }
}
