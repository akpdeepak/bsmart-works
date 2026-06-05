package com.example.demo;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Customer organizations (iteration 9, Cap N) — internal admin CRUD for the tenant's customers and
 * their white-label portal branding + tier. RBAC lives here at the service boundary (RB-10 §2):
 * reads require workspace membership ({@code view_items}); mutations require {@code manage_service}.
 * Every query is workspace-scoped (RB-40 §1); field logic is delegated to
 * {@link ServiceManagementService}, and every mutation is recorded as an event (RB-10 §3).
 */
@RestController
@RequestMapping("/api/v1/service/organizations")
public class CustomerOrganizationController {

    private final CustomerOrganizationRepository organizations;
    private final ServiceManagementService service;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public CustomerOrganizationController(CustomerOrganizationRepository organizations,
                                          ServiceManagementService service, EventService eventService,
                                          AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.organizations = organizations;
        this.service = service;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<CustomerOrganization> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return organizations.findByWorkspaceIdOrderByNameAsc(workspaceId);
    }

    @PostMapping
    public CustomerOrganization create(@Valid @RequestBody CustomerOrganization org) {
        String userId = authenticatedUser.id();
        if (org.getWorkspaceId() == null || org.getWorkspaceId().isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, org.getWorkspaceId(), "manage_service");
        CustomerOrganization saved = organizations.save(service.prepareOrganization(org, userId));
        eventService.record(saved.getId(), "CUSTOMER_ORG_CREATED", userId,
                Map.of("name", safe(saved.getName()), "workspaceId", safe(saved.getWorkspaceId()),
                        "tier", safe(saved.getTier())));
        return saved;
    }

    @PutMapping("/{id}")
    public CustomerOrganization update(@PathVariable String id, @Valid @RequestBody CustomerOrganization updated) {
        String userId = authenticatedUser.id();
        CustomerOrganization existing = load(id);
        rbac.require(userId, existing.getWorkspaceId(), "manage_service");
        CustomerOrganization saved = organizations.save(service.applyOrganizationUpdate(existing, updated));
        eventService.record(saved.getId(), "CUSTOMER_ORG_UPDATED", userId, Map.of("name", safe(saved.getName())));
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        CustomerOrganization org = load(id);
        rbac.require(userId, org.getWorkspaceId(), "manage_service");
        organizations.deleteById(id); // accounts + requests cascade via FK ON DELETE CASCADE
        eventService.record(id, "CUSTOMER_ORG_DELETED", userId, Map.of("name", safe(org.getName())));
        return ResponseEntity.noContent().build();
    }

    private CustomerOrganization load(String id) {
        return organizations.findById(id).orElseThrow(() -> ApiException.notFound("Customer organization", id));
    }

    private String safe(String s) { return s == null ? "" : s; }
}
