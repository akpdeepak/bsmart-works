package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-ORGANIZATION isolation tests for the customer portal (RB-40 §1 — the single catastrophic
 * risk here is one customer reading another's requests). The portal identity is bound to org A via
 * {@link PortalAuthenticatedUser}; every read/write is scoped to that org server-side. A customer of
 * org A asking for org B's request must get a 404 (it does not exist for them) — never another org's
 * data. The org id always comes from the verified token, never the request body. Pure unit — no DB.
 */
@Tag("unit")
class PortalControllerAccessTest {

    private static final String WS = "ws-A";
    private static final String ORG_A = "CORG-A";
    private static final String ORG_B = "CORG-B";
    private static final String ACCOUNT_A = "CACC-A";

    private final CustomerOrganizationRepository orgs = mock(CustomerOrganizationRepository.class);
    private final RequestTypeRepository types = mock(RequestTypeRepository.class);
    private final CustomerRequestRepository requests = mock(CustomerRequestRepository.class);
    private final PortalKbArticleRepository portalArticles = mock(PortalKbArticleRepository.class);
    private final SlaInstanceRepository slaInstances = mock(SlaInstanceRepository.class);
    private final SlaPolicyRepository slaPolicies = mock(SlaPolicyRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final PortalAuthenticatedUser portalUser = mock(PortalAuthenticatedUser.class);
    private final ServiceManagementService service = new ServiceManagementService();

    private final PortalController controller = new PortalController(
            orgs, types, requests, portalArticles, slaInstances, slaPolicies, service,
            eventService, portalUser);

    PortalControllerAccessTest() {
        // The verified portal session is a customer of org A in workspace A.
        when(portalUser.current()).thenReturn(
                new PortalAuthenticatedUser.Principal(ACCOUNT_A, WS, ORG_A, "a@acme.test"));
    }

    @Test
    void readingAnotherOrgsRequest_isNotFound_neverLeaked() {
        // The org-scoped lookup returns empty for org A even though REQ-B exists for org B.
        when(requests.findByIdAndOrganizationId("REQ-B", ORG_A)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.request("REQ-B"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        // The read was scoped to the caller's own org, not the request's org.
        verify(requests).findByIdAndOrganizationId("REQ-B", ORG_A);
        verify(requests, never()).findByIdAndOrganizationId(eq("REQ-B"), eq(ORG_B));
    }

    @Test
    void slaForAnotherOrgsRequest_isNotFound() {
        when(requests.findByIdAndOrganizationId("REQ-B", ORG_A)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.sla("REQ-B"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void csatOnAnotherOrgsRequest_isNotFound_andNothingSaved() {
        when(requests.findByIdAndOrganizationId("REQ-B", ORG_A)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.csat("REQ-B", new PortalController.CsatRequest(5, "great")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(requests, never()).save(any());
    }

    @Test
    void csatBeforeResolution_isRejected() {
        CustomerRequest open = new CustomerRequest();
        open.setId("REQ-A");
        open.setOrganizationId(ORG_A);
        open.setWorkspaceId(WS);
        open.setStatus("OPEN");
        when(requests.findByIdAndOrganizationId("REQ-A", ORG_A)).thenReturn(Optional.of(open));

        assertThatThrownBy(() -> controller.csat("REQ-A", new PortalController.CsatRequest(5, "great")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(requests, never()).save(any());
    }

    @Test
    void submit_withRequestTypeFromAnotherWorkspace_isNotFound() {
        // A type that exists but belongs to a different workspace must not be usable.
        RequestType foreign = new RequestType();
        foreign.setId("RQT-X");
        foreign.setWorkspaceId("ws-OTHER");
        when(types.findById("RQT-X")).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> controller.submit(
                new PortalController.SubmitRequest("RQT-X", "Outage", "desc", "HIGH", "{}")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(requests, never()).save(any());
    }

    @Test
    void submit_withIncompleteRequiredForm_isRejected() {
        RequestType type = new RequestType();
        type.setId("RQT-A");
        type.setWorkspaceId(WS);
        type.setFormSchema("[{\"key\":\"meter\",\"label\":\"Meter number\",\"required\":true}]");
        when(types.findById("RQT-A")).thenReturn(Optional.of(type));

        assertThatThrownBy(() -> controller.submit(
                new PortalController.SubmitRequest("RQT-A", "Outage", "desc", "HIGH", "{}")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(requests, never()).save(any());
    }
}
