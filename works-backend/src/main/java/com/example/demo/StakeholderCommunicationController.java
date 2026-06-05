package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;

/**
 * Cap W · Stakeholder communication HTTP surface (I15-S14). Thin: parses the request, resolves the
 * caller, and delegates to {@link StakeholderCommunicationService} which owns RBAC + tenant scoping
 * (RB-10 §2).
 */
@RestController
@RequestMapping("/api/v1/stakeholder-communications")
public class StakeholderCommunicationController {

    private final StakeholderCommunicationService service;
    private final AuthenticatedUser authenticatedUser;

    public StakeholderCommunicationController(StakeholderCommunicationService service,
                                              AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<StakeholderCommunication> list(@RequestParam(required = false) String projectId,
                                               @RequestParam(required = false) String workspaceId) {
        if (projectId != null) {
            return service.listByProject(authenticatedUser.id(), projectId);
        }
        return service.listByWorkspace(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/{id}")
    public StakeholderCommunication get(@PathVariable String id) {
        return service.get(authenticatedUser.id(), id);
    }

    @PostMapping
    public StakeholderCommunication create(@Valid @RequestBody StakeholderCommunication communication) {
        return service.create(authenticatedUser.id(), communication);
    }

    @PutMapping("/{id}")
    public StakeholderCommunication update(@PathVariable String id,
                                           @Valid @RequestBody StakeholderCommunication updated) {
        return service.update(authenticatedUser.id(), id, updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/send")
    public StakeholderCommunication send(@PathVariable String id) {
        return service.send(authenticatedUser.id(), id);
    }
}
