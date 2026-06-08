package com.bcits.works;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;

/**
 * Cap V · Impediment tracker HTTP surface (I15-S03). Thin: parses the request, resolves the caller,
 * and delegates to {@link ImpedimentService} which owns RBAC + tenant scoping (RB-10 §2).
 */
@RestController
@RequestMapping("/api/v1/impediments")
public class ImpedimentController {

    private final ImpedimentService service;
    private final AuthenticatedUser authenticatedUser;

    public ImpedimentController(ImpedimentService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Impediment> list(@RequestParam String projectId) {
        return service.listByProject(authenticatedUser.id(), projectId);
    }

    @PostMapping
    public Impediment create(@Valid @RequestBody Impediment impediment) {
        return service.create(authenticatedUser.id(), impediment);
    }

    @PutMapping("/{id}")
    public Impediment update(@PathVariable String id, @Valid @RequestBody Impediment updated) {
        return service.update(authenticatedUser.id(), id, updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }
}
