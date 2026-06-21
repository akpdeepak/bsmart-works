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

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * User-built (custom) dashboards — persisted widget grids. Lives on /api/v1/dashboards
 * alongside the computed role dashboards (/developer, /scrum-master, …); those literal
 * paths take precedence over the {id} variable here, so the two coexist cleanly.
 */
@RestController
@RequestMapping("/api/v1/dashboards")
public class CustomDashboardController {

    private final DashboardRepository dashboardRepository;
    private final DashboardWidgetRepository widgetRepository;
    private final DashboardLayoutService layoutService;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public CustomDashboardController(DashboardRepository dashboardRepository,
                                     DashboardWidgetRepository widgetRepository,
                                     DashboardLayoutService layoutService,
                                     EventService eventService, AuthenticatedUser authenticatedUser,
                                     RbacService rbac) {
        this.dashboardRepository = dashboardRepository;
        this.widgetRepository = widgetRepository;
        this.layoutService = layoutService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    // Sortable columns for the dashboards list — allow-listed (RB-10 §4 filtering discipline).
    private static final Set<String> SORTABLE = Set.of("updatedAt", "createdAt", "name");

    @GetMapping
    public PageResponse<Dashboard> list(@RequestParam(required = false) String workspaceId,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "50") int size,
                                        @RequestParam(required = false) String sort) {
        String userId = authenticatedUser.id();
        var pageable = ListPaging.of(page, size, sort, SORTABLE);
        return PageResponse.of(workspaceId != null
            ? dashboardRepository.findByWorkspaceId(workspaceId, pageable)
            : dashboardRepository.findByOwnerId(userId, pageable));
    }

    @GetMapping("/{id}")
    public Dashboard get(@PathVariable String id) {
        Dashboard d = dashboardRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), d.getWorkspaceId(), "view_items");
        d.setWidgets(widgetRepository.findByDashboardIdOrderByPositionAsc(id));
        return d;
    }

    @PostMapping
    public Dashboard create(@Valid @RequestBody Dashboard dashboard) {
        String userId = authenticatedUser.id();
        dashboard.setId("DSH-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        dashboard.setOwnerId(userId);
        dashboard.setScope(dashboard.getScope() != null ? dashboard.getScope() : "PERSONAL");
        // surface is NOT NULL (V70); user-built dashboards are CANVAS. Without @DynamicInsert,
        // Hibernate writes the column explicitly, so a null here becomes a NOT NULL violation (409),
        // not the DB DEFAULT — set it here as the role-Today layouts do (TodayLayoutService).
        dashboard.setSurface(dashboard.getSurface() != null ? dashboard.getSurface() : "CANVAS");
        dashboard.setLayoutCols(layoutService.cols(dashboard.getLayoutCols()));
        dashboard.setCreatedAt(OffsetDateTime.now());
        dashboard.setUpdatedAt(OffsetDateTime.now());
        Dashboard saved = dashboardRepository.save(dashboard);
        eventService.record(saved.getId(), "DASHBOARD_CREATED", userId, "{\"name\":\"" + saved.getName() + "\"}");
        saved.setWidgets(List.of());
        return saved;
    }

    @PutMapping("/{id}")
    public Dashboard update(@PathVariable String id, @Valid @RequestBody Dashboard updated) {
        Dashboard existing = dashboardRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), existing.getWorkspaceId(), "view_items");
        return dashboardRepository.findById(id).map(d -> {
            d.setName(updated.getName());
            if (updated.getScope() != null) d.setScope(updated.getScope());
            if (updated.getProjectId() != null) d.setProjectId(updated.getProjectId());
            if (updated.getLayoutCols() != null) d.setLayoutCols(layoutService.cols(updated.getLayoutCols())); {
            d.setUpdatedAt(OffsetDateTime.now());
            }
            Dashboard saved = dashboardRepository.save(d);
            saved.setWidgets(widgetRepository.findByDashboardIdOrderByPositionAsc(id));
            return saved;
        }).orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        Dashboard existing = dashboardRepository.findById(id).orElseThrow();
        rbac.require(userId, existing.getWorkspaceId(), "view_items");
        dashboardRepository.deleteById(id);
        eventService.record(id, "DASHBOARD_DELETED", userId, "{}");
        return ResponseEntity.noContent().build();
    }

    // Mint (or return the existing) unguessable share token for public read-only embedding.
    @PostMapping("/{id}/share")
    public Dashboard share(@PathVariable String id) {
        String userId = authenticatedUser.id();
        Dashboard d = dashboardRepository.findById(id).orElseThrow();
        rbac.require(userId, d.getWorkspaceId(), "view_items");
        if (d.getShareToken() == null || d.getShareToken().isBlank()) {
            d.setShareToken(java.util.UUID.randomUUID().toString().replace("-", ""));
            d.setUpdatedAt(OffsetDateTime.now());
            dashboardRepository.save(d);
            eventService.record(id, "DASHBOARD_SHARED", userId, "{}");
        }
        return d;
    }

    // Revoke the share token — existing embed URLs stop resolving immediately.
    @DeleteMapping("/{id}/share")
    public Dashboard unshare(@PathVariable String id) {
        String userId = authenticatedUser.id();
        Dashboard d = dashboardRepository.findById(id).orElseThrow();
        rbac.require(userId, d.getWorkspaceId(), "view_items");
        d.setShareToken(null);
        d.setUpdatedAt(OffsetDateTime.now());
        dashboardRepository.save(d);
        eventService.record(id, "DASHBOARD_UNSHARED", userId, "{}");
        return d;
    }

    // ── Widgets ────────────────────────────────────────────────────────────────
    @PostMapping("/{id}/widgets")
    public DashboardWidget addWidget(@PathVariable String id, @Valid @RequestBody DashboardWidget widget) {
        Dashboard d = dashboardRepository.findById(id).orElseThrow();
        // @Filter does not apply to findById (#243 Slice D) — re-check the dashboard's workspace.
        rbac.require(authenticatedUser.id(), d.getWorkspaceId(), "view_items");
        widget.setId(null);
        widget.setDashboardId(id);
        widget.setCreatedAt(OffsetDateTime.now());
        if (widget.getPosition() == null) {
            widget.setPosition(widgetRepository.findByDashboardIdOrderByPositionAsc(id).size());
        }
        layoutService.normalize(widget, d.getLayoutCols());
        return widgetRepository.save(widget);
    }

    @PutMapping("/{id}/widgets/{widgetId}")
    public DashboardWidget updateWidget(@PathVariable String id, @PathVariable Long widgetId,
                                        @Valid @RequestBody DashboardWidget updated) {
        Dashboard d = dashboardRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), d.getWorkspaceId(), "view_items");
        DashboardWidget w = widgetRepository.findById(widgetId).orElseThrow();
        // The widget must belong to this dashboard (findById bypasses @Filter — #243 Slice D).
        if (!id.equals(w.getDashboardId())) {
            throw ApiException.notFound("DashboardWidget", String.valueOf(widgetId));
        }
        if (updated.getTitle() != null) w.setTitle(updated.getTitle());
        if (updated.getConfig() != null) w.setConfig(updated.getConfig());
        if (updated.getWidgetType() != null) w.setWidgetType(updated.getWidgetType()); {
        w.setGridX(updated.getGridX());
        }
        w.setGridY(updated.getGridY());
        w.setGridW(updated.getGridW());
        w.setGridH(updated.getGridH());
        if (updated.getPosition() != null) w.setPosition(updated.getPosition()); {
        layoutService.normalize(w, d.getLayoutCols());
        }
        return widgetRepository.save(w);
    }

    @DeleteMapping("/{id}/widgets/{widgetId}")
    public ResponseEntity<Void> deleteWidget(@PathVariable String id, @PathVariable Long widgetId) {
        Dashboard d = dashboardRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), d.getWorkspaceId(), "view_items");
        // The widget must belong to this dashboard before we delete it (findById bypasses @Filter).
        DashboardWidget w = widgetRepository.findById(widgetId)
                .orElseThrow(() -> ApiException.notFound("DashboardWidget", String.valueOf(widgetId)));
        if (!id.equals(w.getDashboardId())) {
            throw ApiException.notFound("DashboardWidget", String.valueOf(widgetId));
        }
        widgetRepository.deleteById(widgetId);
        return ResponseEntity.noContent().build();
    }

    // Bulk layout save after drag/resize — body is the full widget list with new placements.
    @PutMapping("/{id}/layout")
    public List<DashboardWidget> saveLayout(@PathVariable String id,
                                            @RequestBody List<Map<String, Object>> items) {
        Dashboard d = dashboardRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), d.getWorkspaceId(), "view_items");
        for (Map<String, Object> item : items) {
            Long widgetId = ((Number) item.get("id")).longValue();
            // Only relayout widgets that belong to this (authorized) dashboard.
            widgetRepository.findById(widgetId).filter(w -> id.equals(w.getDashboardId())).ifPresent(w -> {
                w.setGridX(asInt(item.get("gridX")));
                w.setGridY(asInt(item.get("gridY")));
                w.setGridW(asInt(item.get("gridW")));
                w.setGridH(asInt(item.get("gridH")));
                if (item.get("position") != null) w.setPosition(asInt(item.get("position"))); {
                layoutService.normalize(w, d.getLayoutCols());
                }
                widgetRepository.save(w);
            });
        }
        d.setUpdatedAt(OffsetDateTime.now());
        dashboardRepository.save(d);
        return widgetRepository.findByDashboardIdOrderByPositionAsc(id);
    }

    private Integer asInt(Object o) {
        return o == null ? null : ((Number) o).intValue();
    }
}
