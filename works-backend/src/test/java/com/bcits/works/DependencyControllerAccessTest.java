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
 * Cross-tenant access tests for DependencyController (RB-40 §1, RB-05 Stage 3).
 * Dependency resolves its workspace via the parent project (Pattern A).
 * A caller outside that workspace receives NOT_FOUND (404) — never the real entity.
 */
@Tag("unit")
class DependencyControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final DependencyRepository repo = mock(DependencyRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final DependencyController controller =
            new DependencyController(repo, authenticatedUser, rbac);

    DependencyControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);
    }

    private Dependency dependencyInForeignWorkspace() {
        Dependency dep = new Dependency();
        dep.setId("DEP-1");
        dep.setProjectId("PROJ-B");
        dep.setTitle("Foreign dependency");
        return dep;
    }

    @Test
    void get_crossTenantReturnsNotFound() {
        when(repo.findById("DEP-1")).thenReturn(Optional.of(dependencyInForeignWorkspace()));

        assertThatThrownBy(() -> controller.get("DEP-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void get_unknownIdReturnsNotFound() {
        when(repo.findById("DEP-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.get("DEP-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void update_crossTenantReturnsNotFound() {
        when(repo.findById("DEP-1")).thenReturn(Optional.of(dependencyInForeignWorkspace()));

        assertThatThrownBy(() -> controller.update("DEP-1", new Dependency()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repo, never()).save(any());
    }

    @Test
    void update_unknownIdReturnsNotFound() {
        when(repo.findById("DEP-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("DEP-missing", new Dependency()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void delete_crossTenantReturnsNotFound() {
        when(repo.findById("DEP-1")).thenReturn(Optional.of(dependencyInForeignWorkspace()));

        assertThatThrownBy(() -> controller.delete("DEP-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repo, never()).deleteById(any());
    }
}
