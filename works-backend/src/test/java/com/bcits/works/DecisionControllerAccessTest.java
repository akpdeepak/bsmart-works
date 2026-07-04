package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

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
 * Cross-tenant access tests for DecisionController (RB-40 §1, RB-05 Stage 3).
 * Decision resolves its workspace via the parent project (Pattern A).
 * A caller outside that workspace receives NOT_FOUND (404) — never the real entity.
 */
@Tag("unit")
class DecisionControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final DecisionRepository repo = mock(DecisionRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final DecisionController controller =
            new DecisionController(repo, authenticatedUser, rbac);

    DecisionControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);
    }

    private Decision decisionInForeignWorkspace() {
        Decision d = new Decision();
        d.setId("DEC-1");
        d.setProjectId("PROJ-B");
        d.setTitle("Foreign decision");
        return d;
    }

    @Test
    void get_crossTenantReturnsNotFound() {
        when(repo.findById("DEC-1")).thenReturn(Optional.of(decisionInForeignWorkspace()));

        assertThatThrownBy(() -> controller.get("DEC-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void get_unknownIdReturnsNotFound() {
        when(repo.findById("DEC-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.get("DEC-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void update_crossTenantReturnsNotFound() {
        when(repo.findById("DEC-1")).thenReturn(Optional.of(decisionInForeignWorkspace()));

        assertThatThrownBy(() -> controller.update("DEC-1", new Decision()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repo, never()).save(any());
    }

    @Test
    void update_unknownIdReturnsNotFound() {
        when(repo.findById("DEC-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("DEC-missing", new Decision()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void delete_crossTenantReturnsNotFound() {
        when(repo.findById("DEC-1")).thenReturn(Optional.of(decisionInForeignWorkspace()));

        assertThatThrownBy(() -> controller.delete("DEC-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repo, never()).deleteById(any());
    }
}
