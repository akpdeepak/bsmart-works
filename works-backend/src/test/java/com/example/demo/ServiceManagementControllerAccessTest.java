package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant / unauthorized access tests for the INTERNAL service-management write paths
 * (RB-40 §1, RB-05 Stage 3): customer organizations, request types, and the agent queue's
 * triage/KB-publish writes. RBAC + tenant isolation live at the controller's service boundary via
 * {@link RbacService}: a caller acting in a workspace they cannot manage is denied with 403
 * <b>before</b> anything is persisted. Each write covers <b>unauthorized</b> and <b>cross-tenant</b>.
 * Pure unit level — no DB. Mirrors {@link SlaPolicyControllerAccessTest}.
 */
@Tag("unit")
class ServiceManagementControllerAccessTest {

    private static final String CALLER = "user-A";       // member of ws-A only
    private static final String FOREIGN_WS = "ws-B";     // a workspace the caller cannot manage

    private final CustomerOrganizationRepository orgs = mock(CustomerOrganizationRepository.class);
    private final RequestTypeRepository types = mock(RequestTypeRepository.class);
    private final CustomerRequestRepository requests = mock(CustomerRequestRepository.class);
    private final PortalKbArticleRepository portalArticles = mock(PortalKbArticleRepository.class);
    private final SlaInstanceRepository slaInstances = mock(SlaInstanceRepository.class);
    private final SlaPolicyRepository slaPolicies = mock(SlaPolicyRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final ServiceManagementService service = new ServiceManagementService();

    private final CustomerOrganizationController orgController = new CustomerOrganizationController(
            orgs, service, eventService, authenticatedUser, rbac);
    private final RequestTypeController typeController = new RequestTypeController(
            types, service, eventService, authenticatedUser, rbac);
    private final AgentQueueController queueController = new AgentQueueController(
            requests, orgs, types, portalArticles, slaInstances, slaPolicies, service,
            eventService, authenticatedUser, rbac);

    ServiceManagementControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private void denyManage() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, FOREIGN_WS, "manage_service");
    }

    private void denyView() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(CALLER, FOREIGN_WS, "view_items");
    }

    private void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call)
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    private CustomerOrganization foreignOrg() {
        CustomerOrganization o = new CustomerOrganization();
        o.setId("CORG-1");
        o.setWorkspaceId(FOREIGN_WS);
        o.setName("Foreign tenant org");
        return o;
    }

    private RequestType foreignType() {
        RequestType t = new RequestType();
        t.setId("RQT-1");
        t.setWorkspaceId(FOREIGN_WS);
        t.setName("Foreign type");
        return t;
    }

    private CustomerRequest foreignRequest() {
        CustomerRequest r = new CustomerRequest();
        r.setId("REQ-1");
        r.setWorkspaceId(FOREIGN_WS);
        r.setOrganizationId("CORG-1");
        r.setStatus("OPEN");
        return r;
    }

    // ── Customer organizations ───────────────────────────────────────────────────

    @Test
    void createOrg_deniedForForeignWorkspace() {
        CustomerOrganization newOrg = new CustomerOrganization();
        newOrg.setWorkspaceId(FOREIGN_WS);
        newOrg.setName("x");
        denyManage();

        assertForbidden(() -> orgController.create(newOrg));
        verify(orgs, never()).save(any());
    }

    @Test
    void createOrg_withoutWorkspace_isBadRequest() {
        CustomerOrganization newOrg = new CustomerOrganization();
        newOrg.setName("x");

        assertThatThrownBy(() -> orgController.create(newOrg))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(orgs, never()).save(any());
    }

    @Test
    void updateOrg_deniedForForeignWorkspace() {
        when(orgs.findById("CORG-1")).thenReturn(Optional.of(foreignOrg()));
        denyManage();

        assertForbidden(() -> orgController.update("CORG-1", new CustomerOrganization()));
        verify(orgs, never()).save(any());
    }

    @Test
    void deleteOrg_deniedForForeignWorkspace() {
        when(orgs.findById("CORG-1")).thenReturn(Optional.of(foreignOrg()));
        denyManage();

        assertForbidden(() -> orgController.delete("CORG-1"));
        verify(orgs, never()).deleteById(any());
    }

    // ── Request types ────────────────────────────────────────────────────────────

    @Test
    void createType_deniedForForeignWorkspace() {
        RequestType t = new RequestType();
        t.setWorkspaceId(FOREIGN_WS);
        t.setName("x");
        denyManage();

        assertForbidden(() -> typeController.create(t));
        verify(types, never()).save(any());
    }

    @Test
    void updateType_deniedForForeignWorkspace() {
        when(types.findById("RQT-1")).thenReturn(Optional.of(foreignType()));
        denyManage();

        assertForbidden(() -> typeController.update("RQT-1", new RequestType()));
        verify(types, never()).save(any());
    }

    // ── Agent queue triage + KB publish ──────────────────────────────────────────

    @Test
    void queue_deniedForForeignWorkspace() {
        denyView();
        assertForbidden(() -> queueController.queue(FOREIGN_WS, "all"));
    }

    @Test
    void assign_deniedForForeignWorkspace() {
        when(requests.findById("REQ-1")).thenReturn(Optional.of(foreignRequest()));
        denyManage();

        assertForbidden(() -> queueController.assign("REQ-1", new AgentQueueController.AssignRequest(null)));
        verify(requests, never()).save(any());
    }

    @Test
    void setStatus_deniedForForeignWorkspace() {
        when(requests.findById("REQ-1")).thenReturn(Optional.of(foreignRequest()));
        denyManage();

        assertForbidden(() -> queueController.setStatus("REQ-1", new AgentQueueController.StatusRequest("RESOLVED")));
        verify(requests, never()).save(any());
    }

    @Test
    void publishKb_deniedForForeignWorkspace() {
        denyManage();
        assertForbidden(() -> queueController.publish(FOREIGN_WS,
                new AgentQueueController.PublishRequest("ART-1", "Title", "Body")));
        verify(portalArticles, never()).save(any());
    }

    @Test
    void csatTrends_deniedForForeignWorkspace() {
        denyView();
        assertForbidden(() -> queueController.csat(FOREIGN_WS));
    }
}
