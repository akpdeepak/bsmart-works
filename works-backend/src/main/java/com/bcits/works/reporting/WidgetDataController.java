package com.bcits.works.reporting;

import com.bcits.works.shared.AuthenticatedUser;

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
 * for Today and dashboard widgets, and the multi-dimensional {@link PivotService} pivot engine that
 * lets any source render in any chart type with 0…N dimensions. Thin HTTP layer: all resolution,
 * validation, workspace-membership authorization and tenancy scoping live in {@link WidgetDataService}
 * and {@link PivotService} (RB-10 §2 — RBAC in the service, never the controller).
 */
@RestController
@RequestMapping("/api/v1/widget-data")
public class WidgetDataController {

    private final WidgetDataService service;
    private final PivotService pivotService;
    private final AuthenticatedUser authenticatedUser;

    public WidgetDataController(WidgetDataService service, PivotService pivotService,
                                AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.pivotService = pivotService;
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

    // ── Pivot engine ──────────────────────────────────────────────────────────────

    /**
     * The chart-type registry: every chart type with its supported shape (min/max dimensions,
     * min/max measures), so the frontend can offer all charts and guide the user to the ones that
     * fit the current pivot. Pure metadata — no workspace, no tenant data.
     */
    @GetMapping("/chart-types")
    public List<Map<String, Object>> chartTypes() {
        return ChartType.describe();
    }

    /** Resolve one pivot spec into a normalized tabular result any chart can consume. */
    @PostMapping("/pivot")
    public PivotService.PivotResult pivot(@RequestParam String workspaceId,
                                          @RequestBody PivotSpec spec) {
        return pivotService.resolve(workspaceId, authenticatedUser.id(), spec);
    }

    /** Resolve many pivots in one round trip (one report grid, not one call per chart). */
    @PostMapping("/pivot-batch")
    public List<PivotService.PivotBatchResult> pivotBatch(@RequestParam String workspaceId,
                                                          @RequestBody Map<String, PivotSpec> items) {
        return pivotService.batch(workspaceId, authenticatedUser.id(), items);
    }

    public record PreviewRequest(String workspaceId, WidgetSource source) { }

    public record BatchRequest(String workspaceId, Map<String, WidgetSource> items) { }
}
