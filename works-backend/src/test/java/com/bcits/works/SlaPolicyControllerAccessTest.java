package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.BqlCompiler;
import com.bcits.works.shared.EventService;

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
 * Cross-tenant / unauthorized access tests for the SLA policy write paths (RB-40 §1, RB-05 Stage 3).
 *
 * <p>RBAC + tenant isolation live in the controller's service boundary via {@link RbacService}: a
 * caller acting on a policy in a workspace they cannot manage is denied with 403 <b>before</b>
 * anything is persisted or applied. Each write covers the two non-negotiable scenario categories —
 * <b>unauthorized</b> and <b>cross-tenant</b>. Pure unit level — no DB.
 */
@Tag("unit")
class SlaPolicyControllerAccessTest {

    private static final String CALLER = "user-A";       // member of ws-A only
    private static final String FOREIGN_WS = "ws-B";     // a workspace the caller cannot manage

    private final SlaPolicyRepository policies = mock(SlaPolicyRepository.class);
    private final SlaTargetRepository targets = mock(SlaTargetRepository.class);
    private final SlaEscalationRepository escalations = mock(SlaEscalationRepository.class);
    private final SlaEvaluationService evaluation = mock(SlaEvaluationService.class);
    private final BqlCompiler compiler = mock(BqlCompiler.class);
    private final EventService eventService = mock(EventService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final SlaPolicyController controller = new SlaPolicyController(
            policies, targets, escalations, new SlaPolicyService(), evaluation, compiler,
            eventService, authenticatedUser, rbac);

    SlaPolicyControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private SlaPolicy policyInForeignWorkspace() {
        SlaPolicy p = new SlaPolicy();
        p.setId("SLP-1");
        p.setWorkspaceId(FOREIGN_WS);
        p.setName("Foreign tenant policy");
        p.setActive(true);
        return p;
    }

    private void denyManageSla() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, FOREIGN_WS, "manage_sla");
    }

    private void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call)
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void create_deniedForCallerOutsideTheResourceWorkspace() {
        SlaPolicy newPolicy = new SlaPolicy();
        newPolicy.setWorkspaceId(FOREIGN_WS);
        newPolicy.setName("x");
        denyManageSla();

        assertForbidden(() -> controller.create(newPolicy));
        verify(policies, never()).save(any());
    }

    @Test
    void create_withoutWorkspace_isBadRequest() {
        SlaPolicy newPolicy = new SlaPolicy();
        newPolicy.setName("x");

        assertThatThrownBy(() -> controller.create(newPolicy))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(policies, never()).save(any());
    }

    @Test
    void update_deniedForForeignWorkspace() {
        when(policies.findById("SLP-1")).thenReturn(Optional.of(policyInForeignWorkspace()));
        denyManageSla();

        assertForbidden(() -> controller.update("SLP-1", new SlaPolicy()));
        verify(policies, never()).save(any());
    }

    @Test
    void delete_deniedForForeignWorkspace() {
        when(policies.findById("SLP-1")).thenReturn(Optional.of(policyInForeignWorkspace()));
        denyManageSla();

        assertForbidden(() -> controller.delete("SLP-1"));
        verify(policies, never()).deleteById(any());
    }

    @Test
    void apply_deniedForForeignWorkspace() {
        when(policies.findById("SLP-1")).thenReturn(Optional.of(policyInForeignWorkspace()));
        denyManageSla();

        assertForbidden(() -> controller.apply("SLP-1"));
        verify(evaluation, never()).applyNow(any());
    }

    @Test
    void update_unknownPolicy_isNotFound() {
        when(policies.findById("SLP-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("SLP-missing", new SlaPolicy()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(policies, never()).save(any());
    }

    @Test
    void replaceTargets_deniedForForeignWorkspace() {
        when(policies.findById("SLP-1")).thenReturn(Optional.of(policyInForeignWorkspace()));
        denyManageSla();

        assertForbidden(() -> controller.replaceTargets("SLP-1", java.util.List.of()));
        verify(targets, never()).deleteByPolicyId(eq("SLP-1"));
    }
}
