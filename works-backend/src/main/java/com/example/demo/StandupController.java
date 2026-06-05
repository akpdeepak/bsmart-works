package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/**
 * Cap V · Standup facilitator HTTP surface (I15-S02). Thin; delegates to {@link StandupService}.
 */
@RestController
@RequestMapping("/api/v1/standups")
public class StandupController {

    private final StandupService service;
    private final AuthenticatedUser authenticatedUser;

    public StandupController(StandupService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<StandupSession> list(@RequestParam String projectId) {
        return service.listByProject(authenticatedUser.id(), projectId);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        return service.getWithEntries(authenticatedUser.id(), id);
    }

    @PostMapping
    @SuppressWarnings("unchecked")
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        String projectId = (String) body.get("projectId");
        String sprintId = (String) body.get("sprintId");
        List<String> memberIds = (List<String>) body.getOrDefault("memberIds", List.of());
        return service.create(authenticatedUser.id(), projectId, sprintId, memberIds);
    }

    @PostMapping("/{id}/entries/{entryId}/record")
    public StandupEntry record(@PathVariable String id, @PathVariable String entryId,
                               @RequestBody Map<String, String> body) {
        return service.recordEntry(authenticatedUser.id(), id, entryId,
                body.get("yesterday"), body.get("today"), body.get("blockers"));
    }

    @PostMapping("/{id}/advance")
    public StandupSession advance(@PathVariable String id) {
        return service.advance(authenticatedUser.id(), id);
    }

    @PostMapping("/{id}/complete")
    public Map<String, Object> complete(@PathVariable String id) {
        return service.complete(authenticatedUser.id(), id);
    }
}
