package com.bcits.works.projects;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * Cap W · OKR linkage HTTP surface (I15-S12). Thin: parses the request, resolves the caller, and
 * delegates to {@link ObjectiveService} which owns RBAC + tenant scoping (RB-10 §2).
 */
@RestController
@RequestMapping("/api/v1/objectives")
public class ObjectiveController {

    private final ObjectiveService service;
    private final AuthenticatedUser authenticatedUser;

    public ObjectiveController(ObjectiveService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Objective> list(@RequestParam String workspaceId) {
        return service.listByWorkspace(authenticatedUser.id(), workspaceId);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        return service.getWithKeyResults(authenticatedUser.id(), id);
    }

    @PostMapping
    public Objective create(@Valid @RequestBody Objective objective) {
        return service.create(authenticatedUser.id(), objective);
    }

    @PutMapping("/{id}")
    public Objective update(@PathVariable String id, @Valid @RequestBody Objective updated) {
        return service.update(authenticatedUser.id(), id, updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }

    // ── Key results ───────────────────────────────────────────────────────────
    @PostMapping("/{id}/key-results")
    public KeyResult addKeyResult(@PathVariable String id, @Valid @RequestBody KeyResult keyResult) {
        return service.addKeyResult(authenticatedUser.id(), id, keyResult);
    }

    @PutMapping("/key-results/{krId}")
    public KeyResult updateKeyResult(@PathVariable String krId, @Valid @RequestBody KeyResult updated) {
        return service.updateKeyResult(authenticatedUser.id(), krId, updated);
    }

    @DeleteMapping("/key-results/{krId}")
    public ResponseEntity<Void> deleteKeyResult(@PathVariable String krId) {
        service.deleteKeyResult(authenticatedUser.id(), krId);
        return ResponseEntity.noContent().build();
    }

    // ── Links ─────────────────────────────────────────────────────────────────
    @PostMapping("/key-results/{krId}/links")
    public OkrLink link(@PathVariable String krId, @RequestBody Map<String, String> body) {
        return service.linkEntity(authenticatedUser.id(), krId, body.get("entityType"), body.get("entityId"));
    }

    @GetMapping("/key-results/{krId}/links")
    public List<OkrLink> listLinks(@PathVariable String krId) {
        return service.listLinks(authenticatedUser.id(), krId);
    }

    @DeleteMapping("/links/{linkId}")
    public ResponseEntity<Void> unlink(@PathVariable String linkId) {
        service.unlink(authenticatedUser.id(), linkId);
        return ResponseEntity.noContent().build();
    }
}
