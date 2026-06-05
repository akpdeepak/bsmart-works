package com.example.demo;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Request types (iteration 9, Cap N) — internal admin CRUD for the catalogue of things a customer
 * can raise (Incident / Change Request / Service Request / custom) and the per-type portal form
 * schema. RBAC at the service boundary (RB-10 §2): reads require {@code view_items}; mutations
 * require {@code manage_service}. Every query is workspace-scoped (RB-40 §1); field logic delegates
 * to {@link ServiceManagementService}, and every mutation is recorded as an event (RB-10 §3).
 */
@RestController
@RequestMapping("/api/v1/service/request-types")
public class RequestTypeController {

    private final RequestTypeRepository requestTypes;
    private final ServiceManagementService service;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public RequestTypeController(RequestTypeRepository requestTypes, ServiceManagementService service,
                                 EventService eventService, AuthenticatedUser authenticatedUser,
                                 RbacService rbac) {
        this.requestTypes = requestTypes;
        this.service = service;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<RequestType> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return requestTypes.findByWorkspaceIdOrderBySortOrderAscNameAsc(workspaceId);
    }

    @PostMapping
    public RequestType create(@Valid @RequestBody RequestType type) {
        String userId = authenticatedUser.id();
        if (type.getWorkspaceId() == null || type.getWorkspaceId().isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, type.getWorkspaceId(), "manage_service");
        RequestType saved = requestTypes.save(service.prepareRequestType(type, userId));
        eventService.record(saved.getId(), "REQUEST_TYPE_CREATED", userId,
                Map.of("name", safe(saved.getName()), "category", safe(saved.getCategory()),
                        "workspaceId", safe(saved.getWorkspaceId())));
        return saved;
    }

    @PutMapping("/{id}")
    public RequestType update(@PathVariable String id, @Valid @RequestBody RequestType updated) {
        String userId = authenticatedUser.id();
        RequestType existing = load(id);
        rbac.require(userId, existing.getWorkspaceId(), "manage_service");
        RequestType saved = requestTypes.save(service.applyRequestTypeUpdate(existing, updated));
        eventService.record(saved.getId(), "REQUEST_TYPE_UPDATED", userId, Map.of("name", safe(saved.getName())));
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        RequestType type = load(id);
        rbac.require(userId, type.getWorkspaceId(), "manage_service");
        requestTypes.deleteById(id);
        eventService.record(id, "REQUEST_TYPE_DELETED", userId, Map.of("name", safe(type.getName())));
        return ResponseEntity.noContent().build();
    }

    private RequestType load(String id) {
        return requestTypes.findById(id).orElseThrow(() -> ApiException.notFound("Request type", id));
    }

    private String safe(String s) { return s == null ? "" : s; }
}
