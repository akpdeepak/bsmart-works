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
 * Cap W · Idea capture inbox HTTP surface (I15-S10). Thin; delegates to {@link IdeaService}.
 */
@RestController
@RequestMapping("/api/v1/ideas")
public class IdeaController {

    private final IdeaService service;
    private final AuthenticatedUser authenticatedUser;

    public IdeaController(IdeaService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Idea> list(@RequestParam String workspaceId, @RequestParam(required = false) String status) {
        return service.list(authenticatedUser.id(), workspaceId, status);
    }

    @PostMapping
    public Idea create(@Valid @RequestBody Idea idea) {
        return service.create(authenticatedUser.id(), idea);
    }

    @PutMapping("/{id}")
    public Idea update(@PathVariable String id, @Valid @RequestBody Idea updated) {
        return service.update(authenticatedUser.id(), id, updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/promote")
    public Idea promote(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        return service.promote(authenticatedUser.id(), id, body == null ? null : body.get("promotedWorkItemId"));
    }

    @PostMapping("/{id}/vote")
    public Idea vote(@PathVariable String id) {
        return service.vote(authenticatedUser.id(), id);
    }
}
