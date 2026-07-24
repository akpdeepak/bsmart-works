package com.bcits.works.reporting;

import com.bcits.works.AiCapabilities;
import com.bcits.works.ai.api.AiControlPlaneService;
import com.bcits.works.BqlQueryExecutor;
import com.bcits.works.projects.api.Project;
import com.bcits.works.projects.api.ProjectRepository;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.BqlContext;
import com.bcits.works.workitems.api.WorkItem;
import com.bcits.works.workitems.api.WorkItemRepository;
import com.bcits.works.workspaces.api.Team;
import com.bcits.works.workspaces.api.TeamRepository;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The KPI engine (iteration 12, Cap L) — layered metrics with privacy guardrails (commitment 4,
 * RB-40 §1). Individual data is private by default; team / project / org views are aggregated; and
 * the <b>manager view can never drill into an individual</b> — the manager methods simply do not
 * accept a user id, and {@link #personal} refuses to return another user's metrics unless that user
 * has voluntarily shared them. Privacy is enforced here, in the service, not in the UI.
 *
 * <p>Computations are deterministic over workspace-scoped work items (RB-40 §1). The pure aggregation
 * helpers live in {@link MetricFormula}; the deterministic KPI computation kernel (velocity, cycle
 * time, bands, …) lives in {@link KpiMetricCalculator} so it is unit-testable without a database
 * (RB-10 §7). The AI team-health narrative routes through the one control plane and falls back to a
 * deterministic summary (RB-40 §2).
 */
@Service
public class KpiService {

    private final WorkItemRepository workItems;
    private final ProjectRepository projects;
    private final TeamRepository teams;
    private final AiControlPlaneService controlPlane;
    private final BqlQueryExecutor bqlExecutor;
    private final MetricDefinitionService metricDefs;
    private final ObjectMapper json = new ObjectMapper();

    public KpiService(WorkItemRepository workItems, ProjectRepository projects, TeamRepository teams,
                      AiControlPlaneService controlPlane, BqlQueryExecutor bqlExecutor,
                      MetricDefinitionService metricDefs) {
        this.workItems = workItems;
        this.projects = projects;
        this.teams = teams;
        this.controlPlane = controlPlane;
        this.bqlExecutor = bqlExecutor;
        this.metricDefs = metricDefs;
    }

    // ── Public value types ───────────────────────────────────────────────────────

    /**
     * Sprint-over-sprint comparison context for a metric (Cap L "trends"): the immediately preceding
     * snapshot's value, the signed delta, the period it was taken, and whether the movement is an
     * improvement given the metric's {@code higherIsBetter} polarity. Null on a {@link MetricValue}
     * when there is no prior snapshot to compare against (honest empty — RB-20 §4).
     */
    public record MetricTrend(double previousValue, double delta, String previousPeriod,
                              String direction, boolean improving) { }

    /**
     * {@code status} is ON_TRACK / AT_RISK / OFF_TRACK when a numeric target is set; null otherwise.
     * {@code trend} carries the vs-last-period comparison when snapshot history exists, else null.
     */
    public record MetricValue(String key, String label, double value, String unit,
                              boolean higherIsBetter, int sampleSize, String status, MetricTrend trend) {
        /** Convenience for the (common) no-trend construction. */
        public MetricValue(String key, String label, double value, String unit,
                           boolean higherIsBetter, int sampleSize, String status) {
            this(key, label, value, unit, higherIsBetter, sampleSize, status, null);
        }

        MetricValue withTrend(MetricTrend t) {
            return new MetricValue(key, label, value, unit, higherIsBetter, sampleSize, status, t);
        }
    }

    public record Layer(String scopeLevel, String scopeId, String label, List<MetricValue> metrics,
                        String privacyNote) { }

    // ── Personal view (private; self-or-shared only) ──────────────────────────────

    /**
     * One user's personal metrics. If {@code targetUserId} differs from the caller, the target must
     * have voluntarily shared with the caller (else 403) — the API-level guarantee that managers
     * cannot drill into individuals (RB-40 §1).
     */
    public Layer personal(String workspaceId, String requesterId, String targetUserId) {
        String target = (targetUserId == null || targetUserId.isBlank()) ? requesterId : targetUserId;
        if (!target.equals(requesterId)) {
            metricDefs.requireShared(workspaceId, target, requesterId);
        }
        List<WorkItem> mine = scopedItems(workspaceId).stream()
            .filter(w -> target.equals(w.getAssigneeId()))
            .collect(Collectors.toList());
        List<MetricValue> metrics = personalMetrics(mine);
        String note = target.equals(requesterId)
            ? "Private — visible only to you unless you choose to share."
            : "Shared with you voluntarily by the owner.";
        return applyTrends(workspaceId, applyTargetsAndCustomMetrics(workspaceId, requesterId,
            new Layer("INDIVIDUAL", target, "Personal", metrics, note)));
    }

    static List<MetricValue> personalMetrics(List<WorkItem> items) {
        List<MetricValue> out = new ArrayList<>();
        out.add(metric(MetricCatalog.THROUGHPUT, KpiMetricCalculator.doneCount(items), items.size()));
        out.add(metric(MetricCatalog.COMPLETION_RATE, KpiMetricCalculator.completionRate(items), items.size()));
        out.add(metric(MetricCatalog.CYCLE_TIME, KpiMetricCalculator.cycleTimeP85(items), KpiMetricCalculator.doneCountInt(items)));
        out.add(metric(MetricCatalog.WIP, KpiMetricCalculator.wipCount(items), items.size()));
        return out;
    }

    // ── Team / Project / Org aggregated views (no individual breakdown) ────────────

    public Layer team(String workspaceId, String callerId, String teamId) {
        Team t = teams.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
            .filter(x -> x.getId().equals(teamId)).findFirst()
            .orElseThrow(() -> ApiException.notFound("Team", teamId));
        List<WorkItem> items = teamItems(workspaceId, t);
        return applyTrends(workspaceId, applyTargetsAndCustomMetrics(workspaceId, callerId,
            new Layer("TEAM", teamId, t.getName(), aggregateMetrics(items),
                "Aggregated — no individual breakdown (privacy by design.)")));
    }

    public Layer project(String workspaceId, String callerId, String projectId) {
        Project p = projects.findByWorkspaceId(workspaceId).stream()
            .filter(x -> x.getId().equals(projectId)).findFirst()
            .orElseThrow(() -> ApiException.notFound("Project", projectId));
        List<WorkItem> items = workItems.findByProjectId(projectId);
        return applyTrends(workspaceId, applyTargetsAndCustomMetrics(workspaceId, callerId,
            new Layer("PROJECT", projectId, p.getName(), aggregateMetrics(items),
                "Aggregated across the project's contributing teams.")));
    }

    /** Manager view: aggregated metrics per team. Deliberately accepts no <i>target</i> user id —
     *  there is no API path to an individual's numbers from here (RB-40 §1, commitment 4). The
     *  {@code callerId} only drives field-level security on custom metrics, never a drill-down. */
    public List<Layer> manager(String workspaceId, String callerId) {
        return teams.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
            .map(t -> applyTrends(workspaceId, applyTargetsAndCustomMetrics(workspaceId, callerId,
                new Layer("TEAM", t.getId(), t.getName(), aggregateMetrics(teamItems(workspaceId, t)),
                    "Aggregated — individual engineer comparison is unavailable by design."))))
            .collect(Collectors.toList());
    }

    public Layer org(String workspaceId, String callerId) {
        List<WorkItem> items = scopedItems(workspaceId);
        return applyTrends(workspaceId, applyTargetsAndCustomMetrics(workspaceId, callerId,
            new Layer("ORG", null, "Organization", aggregateMetrics(items),
                "Organization-wide rollup — fully aggregated.")));
    }

    /**
     * System ORG rollup for trusted backend jobs (e.g. the snapshot scheduler) that run with no user
     * context. It computes over the full, unrestricted field set — there is no human caller whose
     * field-level visibility could leak — so it never applies the sensitive-field filter (RB-40 §1).
     */
    public Layer orgForSystem(String workspaceId) {
        List<WorkItem> items = scopedItems(workspaceId);
        return applyTargetsAndCustomMetrics(workspaceId, MetricDefinitionService.SYSTEM_CALLER,
            new Layer("ORG", null, "Organization", aggregateMetrics(items),
                "Organization-wide rollup — fully aggregated."));
    }

    /**
     * System per-team rollups for the snapshot writer (TD-025). One aggregated TEAM layer per team,
     * no human caller (full field set; the aggregate never exposes an individual — RB-40 §1). These
     * carry a non-null {@code scopeId} (the team id) so their snapshot history reads back per team and
     * the Team-layer trends light up. Not trend-enriched here — it writes the base series.
     */
    public List<Layer> teamsForSystem(String workspaceId) {
        return teams.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
            .map(t -> applyTargetsAndCustomMetrics(workspaceId, MetricDefinitionService.SYSTEM_CALLER,
                new Layer("TEAM", t.getId(), t.getName(), aggregateMetrics(teamItems(workspaceId, t)),
                    "Aggregated — individual engineer comparison is unavailable by design.")))
            .collect(Collectors.toList());
    }

    /** System per-project rollups for the snapshot writer (TD-025), one PROJECT layer per project. */
    public List<Layer> projectsForSystem(String workspaceId) {
        return projects.findByWorkspaceId(workspaceId).stream()
            .map(p -> applyTargetsAndCustomMetrics(workspaceId, MetricDefinitionService.SYSTEM_CALLER,
                new Layer("PROJECT", p.getId(), p.getName(), aggregateMetrics(workItems.findByProjectId(p.getId())),
                    "Aggregated across the project's contributing teams.")))
            .collect(Collectors.toList());
    }

    static List<MetricValue> aggregateMetrics(List<WorkItem> items) {
        List<MetricValue> out = new ArrayList<>();
        out.add(metric(MetricCatalog.VELOCITY, KpiMetricCalculator.velocity(items), items.size()));
        out.add(metric(MetricCatalog.COMMITMENT_ACCURACY, KpiMetricCalculator.completionRate(items), items.size()));
        out.add(metric(MetricCatalog.CYCLE_TIME, KpiMetricCalculator.cycleTimeP85(items), KpiMetricCalculator.doneCountInt(items)));
        out.add(metric(MetricCatalog.WIP, KpiMetricCalculator.wipCount(items), items.size()));
        out.add(metric(MetricCatalog.BUG_ESCAPE, KpiMetricCalculator.bugEscapeRate(items), items.size()));
        return out;
    }

    // ── Team health composite + cycle-time distribution ───────────────────────────

    public record HealthComposite(String teamId, double predictability, double scopeStability,
                                  double flowEfficiency, double overall, List<String> bands) { }

    public HealthComposite health(String workspaceId, String teamId) {
        Team t = teams.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
            .filter(x -> x.getId().equals(teamId)).findFirst()
            .orElseThrow(() -> ApiException.notFound("Team", teamId));
        List<WorkItem> items = teamItems(workspaceId, t);
        double predictability = KpiMetricCalculator.completionRate(items);
        double scopeStability = KpiMetricCalculator.scopeStability(items);
        double flowEfficiency = KpiMetricCalculator.flowEfficiency(items);
        double overall = MetricFormula.round1((predictability + scopeStability + flowEfficiency) / 3.0);
        List<String> bands = List.of(
            "predictability:" + KpiMetricCalculator.band(predictability),
            "scopeStability:" + KpiMetricCalculator.band(scopeStability),
            "flowEfficiency:" + KpiMetricCalculator.band(flowEfficiency));
        return new HealthComposite(teamId, predictability, scopeStability, flowEfficiency, overall, bands);
    }

    public record Distribution(double median, double p85, List<Integer> buckets, List<String> outliers) { }

    public Distribution distribution(String workspaceId, String scopeLevel, String scopeId) {
        List<WorkItem> items = scopeItems(workspaceId, scopeLevel, scopeId);
        List<WorkItem> done = items.stream().filter(KpiMetricCalculator::isDone).collect(Collectors.toList());
        List<Double> hours = done.stream().map(KpiMetricCalculator::cycleHours).collect(Collectors.toList());
        double median = MetricFormula.median(hours);
        double p85 = MetricFormula.percentile(hours, 85);
        int[] edges = {24, 72, 168, 336};   // 1d, 3d, 1w, 2w
        List<Integer> buckets = KpiMetricCalculator.bucketize(hours, edges);
        List<String> outliers = done.stream()
            .filter(w -> KpiMetricCalculator.cycleHours(w) > p85 && p85 > 0)
            .map(WorkItem::getId).limit(20).collect(Collectors.toList());
        return new Distribution(median, p85, buckets, outliers);
    }

    // ── AI team-health narrative (RB-40 §2; deterministic fallback) ────────────────

    public record Narrative(String text, boolean usedAi, boolean fallback, String policyState) { }

    public Narrative narrative(String workspaceId, String userId, String teamId, boolean inContext) {
        HealthComposite h = health(workspaceId, teamId);
        String deterministic = String.format(Locale.ROOT,
            "Team health %.0f/100. Predictability %.0f%% (%s), scope stability %.0f%% (%s), "
            + "flow efficiency %.0f%% (%s).",
            h.overall(), h.predictability(), KpiMetricCalculator.band(h.predictability()),
            h.scopeStability(), KpiMetricCalculator.band(h.scopeStability()),
            h.flowEfficiency(), KpiMetricCalculator.band(h.flowEfficiency()));
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.KPI_NARRATIVE,
            "Summarise team health for " + teamId, deterministic, null, inContext));
        String text = out.fallback() ? deterministic : out.text();
        return new Narrative(text, out.usedAi(), out.fallback(), out.policyState());
    }

    // Metric definitions, snapshots, and shares now live in MetricDefinitionService; the KPI engine
    // delegates the FLS context (fieldContext), the definition list, and the sharing rule to it.

    // ══════════════════════════════════════════════════════════════════════════════
    //  Metric assembly (binds the computation kernel to catalog metric value types)
    // ══════════════════════════════════════════════════════════════════════════════

    private static MetricValue metric(String key, double value, int sampleSize) {
        MetricCatalog.Metric m = MetricCatalog.get(key);
        return new MetricValue(key, m == null ? key : m.label(), MetricFormula.round1(value),
            m == null ? "" : m.unit(), m != null && m.higherIsBetter(), sampleSize, null);
    }

    /**
     * Builds the vs-last-period trend for a metric from its two most recent <i>distinct</i> snapshot
     * periods (Cap L trends). Pure given the period-ascending snapshot list, so it is unit-testable in
     * isolation (RB-10 §7). Returns null when there is no earlier period to compare against — the
     * caller renders an honest "no comparison yet" rather than a fabricated zero (RB-20 §4).
     */
    static MetricTrend trendFor(List<MetricSnapshot> ascendingByPeriod, double currentValue,
                                boolean higherIsBetter) {
        if (ascendingByPeriod == null || ascendingByPeriod.isEmpty()) {
            return null;
        }
        // The latest snapshot is "now"; the one before it (a different period) is the comparison base.
        MetricSnapshot latest = ascendingByPeriod.get(ascendingByPeriod.size() - 1);
        MetricSnapshot prior = null;
        for (int i = ascendingByPeriod.size() - 2; i >= 0; i--) {
            if (!ascendingByPeriod.get(i).getPeriod().equals(latest.getPeriod())) {
                prior = ascendingByPeriod.get(i);
                break;
            }
        }
        if (prior == null) {
            return null;
        }
        double previous = prior.getValue();
        double delta = MetricFormula.round1(currentValue - previous);
        String direction = delta > 0 ? "UP" : delta < 0 ? "DOWN" : "FLAT";
        // "Improving" depends on polarity: more velocity is good, more cycle-time is not.
        boolean improving = delta == 0 ? false : (higherIsBetter == (delta > 0));
        return new MetricTrend(MetricFormula.round1(previous), delta, prior.getPeriod(), direction, improving);
    }

    /**
     * Enriches a layer's catalog metrics with vs-last-period trends from snapshot history (Cap L).
     * Snapshots are keyed by metricKey + scopeLevel + scopeId, so the comparison stays within the same
     * scope; a layer with no history (e.g. a brand-new workspace, or a scope the snapshot scheduler
     * does not yet cover) simply carries no trends. Workspace-scoped (RB-40 §1).
     */
    private Layer applyTrends(String workspaceId, Layer layer) {
        String scopeId = layer.scopeId() == null ? "" : layer.scopeId();
        List<MetricValue> withTrends = layer.metrics().stream().map(mv -> {
            List<MetricSnapshot> hist = metricDefs.history(workspaceId, mv.key(), layer.scopeLevel(), scopeId);
            MetricTrend trend = trendFor(hist, mv.value(), mv.higherIsBetter());
            return trend == null ? mv : mv.withTrend(trend);
        }).collect(Collectors.toList());
        return new Layer(layer.scopeLevel(), layer.scopeId(), layer.label(), withTrends, layer.privacyNote());
    }

    /**
     * Applies workspace-level targets to produce ON_TRACK/AT_RISK/OFF_TRACK status on each metric,
     * and appends any custom BQL-formula metrics defined for this workspace (RB-10 §6).
     */
    private Layer applyTargetsAndCustomMetrics(String workspaceId, String callerId, Layer layer) {
        // Field-level security (RB-40 §1): compile and surface custom metrics under the caller's own
        // field-visibility context, so a metric built over a sensitive field is silently dropped for
        // a caller whose tier cannot see that field — reusing the BQL field-security gate, not a copy.
        BqlContext ctx = metricDefs.fieldContext(workspaceId, callerId);
        List<MetricDefinition> defs = metricDefs.listDefinitions(workspaceId, callerId);
        Map<String, MetricDefinition> defsByKey = defs.stream()
            .collect(Collectors.toMap(MetricDefinition::getMetricKey, d -> d, (a, b) -> a));

        // Re-evaluate status for catalog metrics that have a target set.
        List<MetricValue> updated = layer.metrics().stream().map(mv -> {
            MetricDefinition def = defsByKey.get(mv.key());
            if (def == null || def.getTarget() == null) {
                return mv;
            }
            String status = KpiMetricCalculator.evaluateStatus(mv.value(), def.getTarget(), mv.higherIsBetter());
            return new MetricValue(mv.key(), mv.label(), mv.value(), mv.unit(),
                mv.higherIsBetter(), mv.sampleSize(), status, mv.trend());
        }).collect(Collectors.toList());

        // Append custom metrics with bqlFormula (unification layer: BQL in KPI definitions, RB-10 §6).
        List<MetricValue> custom = new ArrayList<>();
        for (MetricDefinition def : defs) {
            if (def.getBqlFormula() == null || def.getBqlFormula().isBlank()) {
                continue;
            }
            if (defsByKey.containsKey(def.getMetricKey()) && updated.stream().anyMatch(m -> m.key().equals(def.getMetricKey()))) {
                continue;
            }
            try {
                // Compile + execute the workspace-scoped count centrally (RB-40 §1, advances #243);
                // compiling under the caller's field-security context means a sensitive-field formula
                // throws here for an under-tier caller (defs already filtered above).
                long count = bqlExecutor.countScoped(workspaceId, def.getBqlFormula(), ctx);
                boolean hib = Boolean.TRUE.equals(def.getHigherIsBetter());
                String status = KpiMetricCalculator.evaluateStatus(count, def.getTarget(), hib);
                custom.add(new MetricValue(def.getMetricKey(), def.getName(), count,
                    def.getUnit() == null ? "count" : def.getUnit(), hib, (int) count, status));
            } catch (Exception ignored) {
                // If the formula is malformed, skip rather than fail the whole layer.
            }
        }
        if (!custom.isEmpty()) {
            updated = new ArrayList<>(updated);
            updated.addAll(custom);
        }
        return new Layer(layer.scopeLevel(), layer.scopeId(), layer.label(), updated, layer.privacyNote());
    }

    // ── workspace-scoped data access (RB-40 §1) ────────────────────────────────────

    private List<WorkItem> scopedItems(String workspaceId) {
        return projects.findByWorkspaceId(workspaceId).stream()
            .flatMap(p -> workItems.findByProjectId(p.getId()).stream())
            .collect(Collectors.toList());
    }

    private List<WorkItem> teamItems(String workspaceId, Team team) {
        List<String> projectIds = parseProjectIds(team.getProjectIds());
        if (projectIds.isEmpty()) {
            return scopedItems(workspaceId);   // team with no explicit projects → whole workspace
        }
        // Workspace-scope guard: only projects that belong to this workspace (RB-40 §1).
        java.util.Set<String> wsProjects = projects.findByWorkspaceId(workspaceId).stream()
            .map(Project::getId).collect(Collectors.toSet());
        return projectIds.stream().filter(wsProjects::contains)
            .flatMap(pid -> workItems.findByProjectId(pid).stream())
            .collect(Collectors.toList());
    }

    private List<WorkItem> scopeItems(String workspaceId, String scopeLevel, String scopeId) {
        String level = scopeLevel == null ? "ORG" : scopeLevel.trim().toUpperCase(Locale.ROOT);
        return switch (level) {
            // Tenant guard (RB-40 §1): the project must belong to the caller's workspace, else a
            // view_team_metrics holder could read another workspace's project distribution by id.
            case "PROJECT" -> isProjectInWorkspace(workspaceId, scopeId)
                ? workItems.findByProjectId(scopeId) : List.of();
            case "TEAM" -> teams.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
                .filter(t -> t.getId().equals(scopeId)).findFirst()
                .map(t -> teamItems(workspaceId, t)).orElse(List.of());
            default -> scopedItems(workspaceId);
        };
    }

    /** True when {@code projectId} is a project in {@code workspaceId} — the tenant-isolation check
     *  shared by the project scope of {@code /distribution} (RB-40 §1). */
    private boolean isProjectInWorkspace(String workspaceId, String projectId) {
        return projectId != null && projects.findByWorkspaceId(workspaceId).stream()
            .anyMatch(p -> projectId.equals(p.getId()));
    }

    private List<String> parseProjectIds(String jsonArray) {
        if (jsonArray == null || jsonArray.isBlank()) {
            return List.of();
        }
        try {
            return json.readValue(jsonArray, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() { });
        } catch (Exception e) {
            return List.of();
        }
    }
}
