package com.example.demo;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Request types and their portal forms (iteration 9, Cap N). Workspace-scoped CRUD: reads require
 * workspace membership; mutations require {@code manage_service}. {@code formSchema} carries the
 * per-type portal form (incl. conditional fields), validated as JSON before save. Field logic is
 * delegated to {@link RequestTypeService}; every mutation is recorded as an event (RB-10 §3).
 */
@RestController
@RequestMapping("/api/v1/service/request-types")
public class RequestTypeController {

    private final RequestTypeRepository types;
    private final RequestTypeService typeService;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    public RequestTypeController(RequestTypeRepository types, RequestTypeService typeService,
                                 EventService eventService, AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.types = types;
        this.typeService = typeService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<RequestType> list(@RequestParam String workspaceId,
                                  @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return activeOnly
                ? types.findByWorkspaceIdAndActiveTrueOrderBySortOrderAscNameAsc(workspaceId)
                : types.findByWorkspaceIdOrderBySortOrderAscNameAsc(workspaceId);
    }

    @GetMapping("/{id}")
    public RequestType get(@PathVariable String id) {
        RequestType type = load(id);
        rbac.require(authenticatedUser.id(), type.getWorkspaceId(), "view_items");
        return type;
    }

    @PostMapping
    public RequestType create(@Valid @RequestBody RequestType type) {
        String userId = authenticatedUser.id();
        if (type.getWorkspaceId() == null || type.getWorkspaceId().isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, type.getWorkspaceId(), "manage_service");
        validateFormSchema(type.getFormSchema());
        RequestType saved = types.save(typeService.prepareNew(type, userId));
        eventService.record(saved.getId(), "REQUEST_TYPE_CREATED", userId,
                Map.of("name", safe(saved.getName()), "workspaceId", safe(saved.getWorkspaceId())));
        return saved;
    }

    @PutMapping("/{id}")
    public RequestType update(@PathVariable String id, @RequestBody RequestType updated) {
        String userId = authenticatedUser.id();
        RequestType existing = load(id);
        rbac.require(userId, existing.getWorkspaceId(), "manage_service");
        if (updated.getFormSchema() != null) {
            validateFormSchema(updated.getFormSchema());
        }
        RequestType saved = types.save(typeService.applyUpdate(existing, updated));
        eventService.record(saved.getId(), "REQUEST_TYPE_UPDATED", userId, Map.of("name", safe(saved.getName())));
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        RequestType existing = load(id);
        rbac.require(userId, existing.getWorkspaceId(), "manage_service");
        if (Boolean.TRUE.equals(existing.getIsSystem())) {
            throw ApiException.badRequest("SYSTEM_TYPE", "System request types cannot be deleted; deactivate instead.");
        }
        types.deleteById(id);
        eventService.record(id, "REQUEST_TYPE_DELETED", userId, Map.of("name", safe(existing.getName())));
        return ResponseEntity.noContent().build();
    }

    private RequestType load(String id) {
        return types.findById(id).orElseThrow(() -> ApiException.notFound("Request type", id));
    }

    /** A portal form schema must be a JSON array; reject anything that cannot be parsed as one. */
    private void validateFormSchema(String schema) {
        if (schema == null || schema.isBlank()) {
            return;
        }
        try {
            if (!objectMapper.readTree(schema).isArray()) {
                throw ApiException.badRequest("INVALID_FORM_SCHEMA", "Form schema must be a JSON array of fields.");
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_FORM_SCHEMA", "Form schema is not valid JSON.");
        }
    }

    private static String safe(String s) { return s == null ? "" : s; }
}
