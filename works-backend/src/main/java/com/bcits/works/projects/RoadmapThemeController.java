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

/**
 * Cap W · Product roadmap HTTP surface (I15-S08). Thin; delegates to {@link RoadmapThemeService}.
 */
@RestController
@RequestMapping("/api/v1/roadmap-themes")
public class RoadmapThemeController {

    private final RoadmapThemeService service;
    private final AuthenticatedUser authenticatedUser;

    public RoadmapThemeController(RoadmapThemeService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<RoadmapTheme> list(@RequestParam String workspaceId) {
        return service.list(authenticatedUser.id(), workspaceId);
    }

    @PostMapping
    public RoadmapTheme create(@Valid @RequestBody RoadmapTheme theme) {
        return service.create(authenticatedUser.id(), theme);
    }

    @PutMapping("/{id}")
    public RoadmapTheme update(@PathVariable String id, @Valid @RequestBody RoadmapTheme updated) {
        return service.update(authenticatedUser.id(), id, updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(authenticatedUser.id(), id);
        return ResponseEntity.noContent().build();
    }
}
