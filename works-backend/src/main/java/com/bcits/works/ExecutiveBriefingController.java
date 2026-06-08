package com.bcits.works;

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
 * Cap X · AI executive briefing HTTP surface (iteration 16). Thin; delegates to
 * {@link ExecutiveBriefingService}.
 */
@RestController
@RequestMapping("/api/v1/executive-briefings")
public class ExecutiveBriefingController {

    private final ExecutiveBriefingService service;
    private final AuthenticatedUser authenticatedUser;

    public ExecutiveBriefingController(ExecutiveBriefingService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<ExecutiveBriefing> list(@RequestParam String workspaceId) {
        return service.list(authenticatedUser.id(), workspaceId);
    }

    @PostMapping
    public ExecutiveBriefing create(@Valid @RequestBody ExecutiveBriefing briefing) {
        return service.create(authenticatedUser.id(), briefing);
    }

    @PutMapping("/{id}")
    public ExecutiveBriefing update(@PathVariable String id, @Valid @RequestBody ExecutiveBriefing updated) {
        return service.update(authenticatedUser.id(), id, updated);
    }

    @PostMapping("/{id}/generate")
    public Map<String, Object> generate(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
        boolean inContext = body == null || body.get("aiInContext") == null || Boolean.TRUE.equals(body.get("aiInContext"));
        return service.generate(authenticatedUser.id(), id, inContext);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }
}
