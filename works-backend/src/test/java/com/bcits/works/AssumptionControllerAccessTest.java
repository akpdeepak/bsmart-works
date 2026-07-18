package com.bcits.works;
import com.bcits.works.projects.Assumption;
import com.bcits.works.projects.AssumptionController;
import com.bcits.works.projects.AssumptionRepository;

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
 * Cross-tenant access tests for AssumptionController (RB-40 §1, RB-05 Stage 3).
 * Assumption resolves its workspace via the parent project (Pattern A).
 * A caller outside that workspace receives NOT_FOUND (404) — never the real entity.
 */
@Tag("unit")
class AssumptionControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final AssumptionRepository repo = mock(AssumptionRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final AssumptionController controller =
            new AssumptionController(repo, authenticatedUser, rbac);

    AssumptionControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);
    }

    private Assumption assumptionInForeignWorkspace() {
        Assumption a = new Assumption();
        a.setId("ASM-1");
        a.setProjectId("PROJ-B");
        a.setTitle("Foreign assumption");
        return a;
    }

    @Test
    void get_crossTenantReturnsNotFound() {
        when(repo.findById("ASM-1")).thenReturn(Optional.of(assumptionInForeignWorkspace()));

        assertThatThrownBy(() -> controller.get("ASM-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void get_unknownIdReturnsNotFound() {
        when(repo.findById("ASM-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.get("ASM-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void update_crossTenantReturnsNotFound() {
        when(repo.findById("ASM-1")).thenReturn(Optional.of(assumptionInForeignWorkspace()));

        assertThatThrownBy(() -> controller.update("ASM-1", new Assumption()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repo, never()).save(any());
    }

    @Test
    void update_unknownIdReturnsNotFound() {
        when(repo.findById("ASM-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("ASM-missing", new Assumption()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void delete_crossTenantReturnsNotFound() {
        when(repo.findById("ASM-1")).thenReturn(Optional.of(assumptionInForeignWorkspace()));

        assertThatThrownBy(() -> controller.delete("ASM-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(repo, never()).deleteById(any());
    }
}
