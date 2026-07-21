package com.bcits.works.security;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * Cap Y · Audit log explorer HTTP surface (iteration 16). Thin; delegates to {@link AuditLogService}.
 */
@RestController
@RequestMapping("/api/v1/audit-log")
public class AuditLogController {

    private final AuditLogService service;
    private final AuthenticatedUser authenticatedUser;

    public AuditLogController(AuditLogService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public Map<String, Object> query(@RequestParam String workspaceId,
                                     @RequestParam(required = false) String eventType,
                                     @RequestParam(required = false) String actorId,
                                     @RequestParam(required = false) String aggregateId,
                                     @RequestParam(required = false) String search,
                                     @RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "50") int size) {
        return service.query(authenticatedUser.id(), workspaceId, eventType, actorId, aggregateId, search, page, size);
    }

    @GetMapping("/event-types")
    public List<String> eventTypes(@RequestParam String workspaceId) {
        return service.eventTypes(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/saved-queries")
    public List<AuditSavedQuery> savedQueries(@RequestParam String workspaceId) {
        return service.listSavedQueries(authenticatedUser.id(), workspaceId);
    }

    @PostMapping("/saved-queries")
    public AuditSavedQuery saveQuery(@Valid @RequestBody AuditSavedQuery query) {
        return service.saveQuery(authenticatedUser.id(), query);
    }

    @DeleteMapping("/saved-queries/{id}")
    public ResponseEntity<Void> deleteQuery(@PathVariable String id) {
        service.deleteSavedQuery(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }
}
