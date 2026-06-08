package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Tenant-isolation + RBAC tests for the agent-side service request API (RB-40 §1). A caller who is
 * not a member of a request's workspace, or who lacks {@code work_service}, must be denied and no
 * state may change.
 */
@Tag("unit")
class ServiceRequestControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final ServiceRequestRepository repository = mock(ServiceRequestRepository.class);
    private final ServiceRequestService requestService = new ServiceRequestService();
    private final EventService eventService = mock(EventService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);

    private final ServiceRequestController controller =
            new ServiceRequestController(repository, requestService, eventService, authenticatedUser, rbac);

    ServiceRequestControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private ServiceRequest foreignRequest() {
        ServiceRequest r = new ServiceRequest();
        r.setId("SR-1");
        r.setWorkspaceId(FOREIGN_WS);
        r.setCustomerAccountId("CA-B");
        r.setStatus("NEW");
        return r;
    }

    private void denyRequire(String workspaceId, String permission) {
        doThrow(ApiException.forbidden("nope")).when(rbac).require(CALLER, workspaceId, permission);
    }

    @Test
    void queue_deniedForNonMemberWorkspace() {
        denyRequire(FOREIGN_WS, "view_items");
        assertThatThrownBy(() -> controller.queue(FOREIGN_WS, "open"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(repository, never()).findByWorkspaceIdAndStatusInOrderByCreatedAtDesc(any(), any());
    }

    @Test
    void transition_deniedWhenCallerLacksWorkServiceInResourceWorkspace() {
        when(repository.findById("SR-1")).thenReturn(Optional.of(foreignRequest()));
        denyRequire(FOREIGN_WS, "work_service");

        assertThatThrownBy(() -> controller.transition("SR-1", Map.of("status", "OPEN")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).save(any());
        verify(eventService, never()).record(any(), any(), any(), anyMap());
    }

    @Test
    void assign_deniedForNonMember_andNothingPersisted() {
        when(repository.findById("SR-1")).thenReturn(Optional.of(foreignRequest()));
        denyRequire(FOREIGN_WS, "work_service");

        assertThatThrownBy(() -> controller.assign("SR-1", null))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(repository, never()).save(any());
    }

    @Test
    void get_missingRequestIs404() {
        when(repository.findById("SR-X")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> controller.get("SR-X"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
