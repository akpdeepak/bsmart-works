package com.bcits.works;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Per-role Home → Today layouts, stored as surface='TODAY' rows in the existing
 * dashboards/dashboard_widgets tables (one customization framework — RB-20 §3).
 *
 * <p>Effective-layout resolution, most specific wins:
 * personal override (owner_id = caller) → workspace role template (owner_id NULL)
 * → built-in default (no row; the frontend owns the built-in widget set).
 *
 * <p>Authorization lives here, not in the controller (RB-10 §2): any member may
 * read and manage their own personal layout ({@code view_items}); workspace role
 * templates require {@code manage_workspace} (ADMIN+). The membership gate doubles
 * as the cross-tenant boundary — non-members of the workspace get 403 (RB-40 §1).
 */
@Service
public class TodayLayoutService {

    static final Set<String> ROLE_KEYS =
        Set.of("developer", "scrum-master", "product-owner", "executive", "admin");
    static final int MAX_WIDGETS = 12;
    private static final String SURFACE_TODAY = "TODAY";

    private final DashboardRepository dashboards;
    private final DashboardWidgetRepository widgets;
    private final DashboardLayoutService layoutService;
    private final EventService eventService;
    private final RbacService rbac;

    public TodayLayoutService(DashboardRepository dashboards, DashboardWidgetRepository widgets,
                              DashboardLayoutService layoutService, EventService eventService,
                              RbacService rbac) {
        this.dashboards = dashboards;
        this.widgets = widgets;
        this.layoutService = layoutService;
        this.eventService = eventService;
        this.rbac = rbac;
    }

    /** The resolved layout plus which layer it came from: personal | workspace | builtin. */
    public record EffectiveLayout(String source, Dashboard dashboard) { }

    public EffectiveLayout effective(String userId, String workspaceId, String roleKey) {
        rbac.require(userId, workspaceId, "view_items");
        validateRole(roleKey);
        Optional<Dashboard> personal = dashboards
            .findByWorkspaceIdAndSurfaceAndRoleKeyAndOwnerId(workspaceId, SURFACE_TODAY, roleKey, userId);
        if (personal.isPresent()) {
            return new EffectiveLayout("personal", withWidgets(personal.get()));
        }
        Optional<Dashboard> template = dashboards
            .findByWorkspaceIdAndSurfaceAndRoleKeyAndOwnerIdIsNull(workspaceId, SURFACE_TODAY, roleKey);
        if (template.isPresent()) {
            return new EffectiveLayout("workspace", withWidgets(template.get()));
        }
        return new EffectiveLayout("builtin", null);
    }

    @Transactional
    public Dashboard savePersonal(String userId, String workspaceId, String roleKey,
                                  List<DashboardWidget> incoming) {
        rbac.require(userId, workspaceId, "view_items");
        return upsert(workspaceId, roleKey, userId, incoming, userId);
    }

    @Transactional
    public Dashboard saveWorkspaceTemplate(String actorId, String workspaceId, String roleKey,
                                           List<DashboardWidget> incoming) {
        rbac.require(actorId, workspaceId, "manage_workspace");
        return upsert(workspaceId, roleKey, null, incoming, actorId);
    }

    /** Drop the caller's personal override so the workspace/built-in default applies again. */
    @Transactional
    public void resetPersonal(String userId, String workspaceId, String roleKey) {
        rbac.require(userId, workspaceId, "view_items");
        validateRole(roleKey);
        dashboards
            .findByWorkspaceIdAndSurfaceAndRoleKeyAndOwnerId(workspaceId, SURFACE_TODAY, roleKey, userId)
            .ifPresent(d -> {
                widgets.deleteByDashboardId(d.getId());
                dashboards.deleteById(d.getId());
                eventService.record(d.getId(), "TODAY_LAYOUT_RESET", userId,
                    "{\"role\":\"" + roleKey + "\"}");
            });
    }

    private Dashboard upsert(String workspaceId, String roleKey, String ownerId,
                             List<DashboardWidget> incoming, String actorId) {
        validateRole(roleKey);
        validateWidgets(incoming);
        Dashboard layout = (ownerId == null
            ? dashboards.findByWorkspaceIdAndSurfaceAndRoleKeyAndOwnerIdIsNull(
                workspaceId, SURFACE_TODAY, roleKey)
            : dashboards.findByWorkspaceIdAndSurfaceAndRoleKeyAndOwnerId(
                workspaceId, SURFACE_TODAY, roleKey, ownerId))
            .orElseGet(() -> {
                Dashboard d = new Dashboard();
                d.setId("TDL-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                d.setWorkspaceId(workspaceId);
                d.setSurface(SURFACE_TODAY);
                d.setRoleKey(roleKey);
                d.setOwnerId(ownerId);
                d.setName("Today — " + roleKey);
                d.setScope(ownerId == null ? "ORG" : "PERSONAL");
                d.setLayoutCols(layoutService.cols(null));
                d.setCreatedAt(OffsetDateTime.now());
                return d;
            });
        layout.setUpdatedAt(OffsetDateTime.now());
        Dashboard saved = dashboards.save(layout);

        widgets.deleteByDashboardId(saved.getId());
        for (int i = 0; i < incoming.size(); i++) {
            DashboardWidget w = incoming.get(i);
            w.setId(null);
            w.setDashboardId(saved.getId());
            if (w.getPosition() == null) {
                w.setPosition(i);
            }
            if (w.getCreatedAt() == null) {
                w.setCreatedAt(OffsetDateTime.now());
            }
            layoutService.normalize(w, saved.getLayoutCols());
            widgets.save(w);
        }
        eventService.record(saved.getId(), "TODAY_LAYOUT_SAVED", actorId,
            "{\"role\":\"" + roleKey + "\",\"layer\":\"" + (ownerId == null ? "workspace" : "personal")
            + "\",\"widgets\":" + incoming.size() + "}");
        return withWidgets(saved);
    }

    private Dashboard withWidgets(Dashboard d) {
        d.setWidgets(widgets.findByDashboardIdOrderByPositionAsc(d.getId()));
        return d;
    }

    private void validateRole(String roleKey) {
        if (roleKey == null || !ROLE_KEYS.contains(roleKey)) {
            throw ApiException.badRequest("INVALID_ROLE",
                "Unknown Today role: " + roleKey + ". Expected one of " + ROLE_KEYS + ".", "role");
        }
    }

    private void validateWidgets(List<DashboardWidget> incoming) {
        if (incoming == null) {
            throw ApiException.badRequest("INVALID_LAYOUT", "Widget list is required.", "widgets");
        }
        if (incoming.size() > MAX_WIDGETS) {
            throw ApiException.badRequest("LAYOUT_TOO_LARGE",
                "A Today layout holds at most " + MAX_WIDGETS + " widgets.", "widgets");
        }
        for (DashboardWidget w : incoming) {
            if (w.getWidgetType() == null || w.getWidgetType().isBlank()) {
                throw ApiException.badRequest("INVALID_WIDGET", "Every widget needs a widgetType.", "widgets");
            }
        }
    }
}
