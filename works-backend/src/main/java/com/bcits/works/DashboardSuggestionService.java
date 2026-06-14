package com.bcits.works;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Cap J · AI-suggested starter dashboards (RB-40 §2, INSIGHTS-AI-ALIGNMENT-REVIEW §2.2). Proposes a
 * small starter set of dashboard widgets for a user from their <em>role</em> + workspace context, so
 * a brand-new user gets a useful dashboard out of the box rather than a blank canvas (RB-20 §3
 * "defaults for the 80%").
 *
 * <p>This is a <b>classification/selection</b> task — picking which curated widgets fit the role —
 * not long generation, so the capability defaults to the cheap HAIKU tier. The proposed widgets are
 * always the deterministic role-based starter set (the structure must be valid regardless of the
 * model, exactly like {@link ConversationalDashboardService}'s parse); AI only contributes a short
 * rationale caption when it runs. The deterministic starter set is the mandatory fallback served when
 * AI is off, over budget or unavailable — it is the existing template/widget-gallery defaults the
 * user can accept as-is (no fallback = it does not ship).
 *
 * <p>RBAC ({@code view_items}) is enforced here at the service boundary (RB-10 §2) before the
 * workspace AI budget is touched. The starter set is built from the pure {@link MetricCatalog} +
 * renderable widget types, so this service never re-queries {@code work_items} and there is no
 * tenant-scoped data access here (RB-40 §1). The pure {@link #starterWidgets} is unit-testable
 * without a database (RB-10 §7).
 */
@Service
public class DashboardSuggestionService {

    /** The role keys the starter sets are keyed on — the same vocabulary as the Today layouts
     *  ({@code TodayLayoutService.ROLE_KEYS}, V70). Unknown/blank roles get a sensible generic set. */
    static final List<String> ROLE_KEYS =
        List.of("developer", "scrum-master", "product-owner", "executive", "admin");

    private final AiControlPlaneService controlPlane;
    private final RbacService rbac;

    public DashboardSuggestionService(AiControlPlaneService controlPlane, RbacService rbac) {
        this.controlPlane = controlPlane;
        this.rbac = rbac;
    }

    /** A single proposed widget — a renderable widget type plus its config + suggested grid width.
     *  Shaped to drop straight into the existing dashboard widget create call (App.jsx
     *  {@code addDashboardWidget}); {@code config} mirrors what the widget gallery already posts. */
    public record ProposedWidget(String widgetType, String title, Map<String, Object> config, int gridW) { }

    /** The suggestion plus the control-plane verdict, so the UI can show provenance honestly. */
    public record Suggestion(String role, String name, String rationale, List<ProposedWidget> widgets,
                             boolean usedAi, boolean fallback, String policyState, String tier) { }

    /**
     * Suggest a starter dashboard for {@code userId} in {@code workspaceId} given their {@code role}.
     * RBAC ({@code view_items}) is enforced here before the workspace AI budget is touched (RB-10 §2).
     * The widget set is always the deterministic role-based starter set; AI only refines the rationale.
     */
    public Suggestion suggest(String workspaceId, String userId, String role, boolean inContext) {
        rbac.require(userId, workspaceId, "view_items");

        String roleKey = normalizeRole(role);
        List<ProposedWidget> widgets = starterWidgets(roleKey);
        String name = nameFor(roleKey);
        String deterministicRationale = rationaleFor(roleKey, widgets);

        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.DASHBOARD_SUGGESTION,
            "Suggest a starter dashboard for a " + roleKey + " from these widgets: " + deterministicRationale,
            deterministicRationale, "dashsuggest:" + roleKey, inContext));

        // The widget set is always deterministic (structure must be valid regardless of the model);
        // the AI text, when it ran, becomes the human-readable rationale shown above the preview.
        String rationale = out.fallback() || out.text() == null ? deterministicRationale : out.text();
        return new Suggestion(roleKey, name, rationale, widgets, out.usedAi(), out.fallback(),
            out.policyState(), out.tier() == null ? "NONE" : out.tier().name());
    }

    /**
     * The deterministic role-based starter widget set — the mandatory fallback. Pure: maps a role to a
     * small, sensible set of curated widgets drawn from renderable widget types + the {@link MetricCatalog}.
     * Unknown roles get the generic delivery set. Capped well under the Today-layout 12-widget ceiling.
     */
    static List<ProposedWidget> starterWidgets(String roleKey) {
        return switch (roleKey) {
            case "developer" -> List.of(
                scorecard("My open work", Map.of("filter", Map.of("mine", true, "open", true))),
                itemList("My active items", Map.of("filter", Map.of("mine", true, "open", true), "limit", 6)),
                statusBar("My work by status", Map.of("filter", Map.of("mine", true))),
                metricBar("Cycle time", MetricCatalog.CYCLE_TIME));
            case "scrum-master" -> List.of(
                scorecard("Open items", Map.of("filter", Map.of("open", true))),
                statusBar("Sprint by status", Map.of()),
                metricBar("Velocity", MetricCatalog.VELOCITY),
                metricBar("Work in progress", MetricCatalog.WIP),
                itemList("Blocked items", Map.of("filter", Map.of("open", true), "limit", 6)));
            case "product-owner" -> List.of(
                scorecard("Open items", Map.of("filter", Map.of("open", true))),
                pie("Items by type", Map.of("dimension", "type")),
                bar("Items by priority", Map.of("dimension", "priority")),
                metricBar("Throughput", MetricCatalog.THROUGHPUT));
            case "executive" -> List.of(
                scorecard("Open items", Map.of("filter", Map.of("open", true))),
                metricBar("Velocity", MetricCatalog.VELOCITY),
                metricBar("Completion rate", MetricCatalog.COMPLETION_RATE),
                pie("Items by type", Map.of("dimension", "type")));
            case "admin" -> List.of(
                scorecard("Open items", Map.of("filter", Map.of("open", true))),
                statusBar("Items by status", Map.of()),
                pie("Items by type", Map.of("dimension", "type")),
                bar("Items by priority", Map.of("dimension", "priority")));
            // Generic delivery set for any other / unknown role.
            default -> List.of(
                scorecard("Open items", Map.of("filter", Map.of("open", true))),
                statusBar("Items by status", Map.of()),
                itemList("Recent open items", Map.of("filter", Map.of("open", true), "limit", 6)));
        };
    }

    // ── widget factory helpers (pure) ────────────────────────────────────────────

    private static ProposedWidget scorecard(String title, Map<String, Object> config) {
        return new ProposedWidget("SCORECARD", title, config, 3);
    }

    private static ProposedWidget statusBar(String title, Map<String, Object> config) {
        return new ProposedWidget("STATUS_BAR", title, config, 6);
    }

    private static ProposedWidget itemList(String title, Map<String, Object> config) {
        return new ProposedWidget("ITEM_LIST", title, config, 6);
    }

    private static ProposedWidget pie(String title, Map<String, Object> config) {
        return new ProposedWidget("PIE", title, config, 4);
    }

    private static ProposedWidget bar(String title, Map<String, Object> config) {
        return new ProposedWidget("BAR", title, config, 4);
    }

    /** A metric-backed bar widget keyed on a {@link MetricCatalog} metric (a curated aggregate). */
    private static ProposedWidget metricBar(String title, String metricKey) {
        return new ProposedWidget("BAR", title, Map.of("source", Map.of("kind", "metric", "key", metricKey)), 4);
    }

    // ── naming + rationale (pure) ────────────────────────────────────────────────

    static String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "developer";
        }
        String key = role.trim().toLowerCase(Locale.ROOT).replace('_', '-').replace(' ', '-');
        return ROLE_KEYS.contains(key) ? key : "developer";
    }

    static String nameFor(String roleKey) {
        String pretty = switch (roleKey) {
            case "scrum-master" -> "Scrum Master";
            case "product-owner" -> "Product Owner";
            case "executive" -> "Executive";
            case "admin" -> "Admin";
            default -> "Developer";
        };
        return pretty + " starter dashboard";
    }

    static String rationaleFor(String roleKey, List<ProposedWidget> widgets) {
        String titles = widgets.stream().map(ProposedWidget::title).reduce((a, b) -> a + ", " + b).orElse("none");
        return String.format(Locale.ROOT,
            "A %d-widget starter set tuned for the %s role: %s.",
            widgets.size(), nameFor(roleKey).replace(" starter dashboard", ""), titles);
    }
}
