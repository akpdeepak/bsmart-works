package com.bcits.works;
import com.bcits.works.shared.api.Risk;
import com.bcits.works.projects.RiskController;
import com.bcits.works.projects.RiskRepository;

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
 * Cross-tenant access tests for RiskController (RB-40 §1, RB-05 Stage 3).
 * Risk resolves its workspace via the parent project (Pattern A).
 * A caller outside that workspace receives NOT_FOUND (404) — never the real entity.
 */
@Tag("unit")
class RiskControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final RiskRepository riskRepo = mock(RiskRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final RiskController controller =
            new RiskController(riskRepo, authenticatedUser, rbac);

    RiskControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);
    }

    private Risk riskInForeignWorkspace() {
        Risk r = new Risk();
        r.setId("RSK-1");
        r.setProjectId("PROJ-B");
        r.setTitle("Foreign risk");
        return r;
    }

    @Test
    void get_crossTenantReturnsNotFound() {
        when(riskRepo.findById("RSK-1")).thenReturn(Optional.of(riskInForeignWorkspace()));

        assertThatThrownBy(() -> controller.get("RSK-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void get_unknownIdReturnsNotFound() {
        when(riskRepo.findById("RSK-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.get("RSK-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void update_crossTenantReturnsNotFound() {
        when(riskRepo.findById("RSK-1")).thenReturn(Optional.of(riskInForeignWorkspace()));

        assertThatThrownBy(() -> controller.update("RSK-1", new Risk()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(riskRepo, never()).save(any());
    }

    @Test
    void update_unknownIdReturnsNotFound() {
        when(riskRepo.findById("RSK-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("RSK-missing", new Risk()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void delete_crossTenantReturnsNotFound() {
        when(riskRepo.findById("RSK-1")).thenReturn(Optional.of(riskInForeignWorkspace()));

        assertThatThrownBy(() -> controller.delete("RSK-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(riskRepo, never()).deleteById(any());
    }
}
