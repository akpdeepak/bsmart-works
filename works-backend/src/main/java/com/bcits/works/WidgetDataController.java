package com.bcits.works;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Widget data executor — turns a {@link WidgetSource} (metric | guided | bql) into renderable data
 * for Today and dashboard widgets. Thin HTTP layer: all resolution, validation, workspace-membership
 * authorization and tenancy scoping live in {@link WidgetDataService} (RB-10 §2 — RBAC in the
 * service, never the controller).
 */
@RestController
@RequestMapping("/api/v1/widget-data")
public class WidgetDataController {

    private final WidgetDataService service;
    private final AuthenticatedUser authenticatedUser;

    public WidgetDataController(WidgetDataService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    /** Curated metric catalog for the "Pick a metric" picker (key + label + shape). */
    @GetMapping("/metrics")
    public List<Map<String, Object>> metrics(@RequestParam String workspaceId) {
        return service.metricCatalog(workspaceId, authenticatedUser.id());
    }

    /** Resolve one source — the editor's live preview. */
    @PostMapping("/preview")
    public WidgetDataService.WidgetData preview(@RequestBody PreviewRequest request) {
        return service.resolve(request.workspaceId(), authenticatedUser.id(), request.source());
    }

    /** Resolve a whole Today/dashboard grid in one round trip (NFR: one call, not one per widget). */
    @PostMapping("/batch")
    public List<WidgetDataService.BatchResult> batch(@RequestBody BatchRequest request) {
        return service.batch(request.workspaceId(), authenticatedUser.id(), request.items());
    }

    public record PreviewRequest(String workspaceId, WidgetSource source) { }

    public record BatchRequest(String workspaceId, Map<String, WidgetSource> items) { }
}
