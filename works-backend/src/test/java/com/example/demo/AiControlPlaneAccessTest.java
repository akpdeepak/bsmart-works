package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant / unauthorized access tests for the AI Control Plane (iteration 10, RB-40 §1/§2,
 * RB-05 Stage 3). Admin writes require {@code manage_ai}; the AI surfaces require workspace
 * membership. A caller acting on a workspace they cannot administer (or are not a member of) is
 * denied with 403 before anything is persisted or any model/fallback runs. Pure unit level — no DB.
 */
@Tag("unit")
class AiControlPlaneAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    // Policy admin surface
    private final AiWorkspacePolicyRepository policies = mock(AiWorkspacePolicyRepository.class);
    private final AiCapabilityToggleRepository toggles = mock(AiCapabilityToggleRepository.class);
    private final AiDataBoundaryRepository boundaries = mock(AiDataBoundaryRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final AiPolicyController policyController =
        new AiPolicyController(policies, toggles, boundaries, eventService, authenticatedUser, rbac);

    // Orchestration surface
    private final AiOrchestrationService orchestration = mock(AiOrchestrationService.class);
    private final AiOrchestrationController orchestrationController =
        new AiOrchestrationController(orchestration, authenticatedUser, rbac);

    AiControlPlaneAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call)
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void setPolicy_deniedWithoutManageAi() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, FOREIGN_WS, "manage_ai");
        assertForbidden(() -> policyController.setPolicy(Map.of("workspaceId", FOREIGN_WS, "mode", "ENABLED")));
        verify(policies, never()).save(any());
    }

    @Test
    void setCapability_deniedWithoutManageAi() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, FOREIGN_WS, "manage_ai");
        assertForbidden(() -> policyController.setCapability(
            Map.of("workspaceId", FOREIGN_WS, "capability", "NL_TO_BQL", "enabled", false)));
        verify(toggles, never()).save(any());
    }

    @Test
    void setDataBoundary_deniedWithoutManageAi() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, FOREIGN_WS, "manage_ai");
        assertForbidden(() -> policyController.setBoundary(
            Map.of("workspaceId", FOREIGN_WS, "blockPii", true)));
        verify(boundaries, never()).save(any());
    }

    @Test
    void getPolicy_deniedForNonMember() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, FOREIGN_WS, "view_items");
        assertForbidden(() -> policyController.get(FOREIGN_WS));
    }

    @Test
    void setPolicy_withoutWorkspace_isBadRequest() {
        assertThatThrownBy(() -> policyController.setPolicy(Map.of("mode", "ENABLED")))
            .isInstanceOf(ApiException.class)
            .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(policies, never()).save(any());
    }

    @Test
    void nlToBql_deniedForNonMember_andNeverReachesOrchestration() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, FOREIGN_WS, "view_items");
        assertForbidden(() -> orchestrationController.nlToBql(
            Map.of("workspaceId", FOREIGN_WS, "phrase", "open bugs")));
        verify(orchestration, never()).nlToBql(any(), any(), any(), org.mockito.ArgumentMatchers.anyBoolean());
    }

    @Test
    void summarize_deniedForNonMember_andNeverReachesOrchestration() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, FOREIGN_WS, "view_items");
        assertForbidden(() -> orchestrationController.summarize(
            Map.of("workspaceId", FOREIGN_WS, "text", "some text")));
        verify(orchestration, never()).summarize(any(), any(), any(), org.mockito.ArgumentMatchers.anyBoolean());
    }
}
