package com.example.demo;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Orchestrates the layered KPI views (iteration 12, Cap L): it resolves a layer + scope into a
 * privacy-safe metric bundle, applies the anonymity floor, and merges the metric catalog with the
 * computed values. The privacy verdicts come from {@link KpiPrivacyService} (the single guard); the
 * numbers come from {@link KpiComputationService}; scope predicates from {@link AggregationService}.
 *
 * <p>The defining guarantee — a manager (or anyone) can never obtain individual data above the personal
 * layer, even via the API — is enforced here by {@link KpiPrivacyService#assertNoIndividualScope} plus
 * per-layer suppression, not in the UI.
 */
@Service
public class KpiService {

    private final MetricDefinitionRepository definitions;
    private final MetricShareRepository shares;
    private final WorkspaceKpiSettingsRepository settingsRepo;
    private final TeamRepository teams;
    private final AggregationService aggregation;
    private final KpiComputationService computation;
    private final KpiPrivacyService privacy;
    private final CycleTimeStatsService stats;
    private final TeamHealthService health;
    private final TeamHealthNarrativeService narrative;
    private final RbacService rbac;

    public KpiService(MetricDefinitionRepository definitions, MetricShareRepository shares,
                      WorkspaceKpiSettingsRepository settingsRepo, TeamRepository teams,
                      AggregationService aggregation, KpiComputationService computation,
                      KpiPrivacyService privacy, CycleTimeStatsService stats,
                      TeamHealthService health, TeamHealthNarrativeService narrative, RbacService rbac) {
        this.definitions = definitions;
        this.shares = shares;
        this.settingsRepo = settingsRepo;
        this.teams = teams;
        this.aggregation = aggregation;
        this.computation = computation;
        this.privacy = privacy;
        this.stats = stats;
        this.health = health;
        this.narrative = narrative;
        this.rbac = rbac;
    }

    /** A resolved scope: the layer, the SQL filter, and the human-readable scope reference. */
    record ScopeResult(String layer, AggregationService.ScopeFilter filter, String scopeRef) {}

    /**
     * Resolve a requested layer into a scope predicate, enforcing every privacy invariant first:
     * the aggregated layers reject an individual target (the manager-drill-down block), and a personal
     * view of someone else requires an active voluntary share.
     */
    ScopeResult resolveScope(String layer, String requesterId, String workspaceId,
                             String projectId, String teamId, String targetUserId) {
        String l = privacy.normalizeLayer(layer);
        // Hard block: no individual identifier may be passed to an aggregated layer.
        privacy.assertNoIndividualScope(l, targetUserId);

        switch (l) {
            case "PERSONAL": {
                String owner = (targetUserId == null || targetUserId.isBlank()) ? requesterId : targetUserId;
                privacy.assertCanViewPersonal(requesterId, owner,
                    shares.findBySharedWithId(requesterId), OffsetDateTime.now());
                return new ScopeResult(l, aggregation.resolve("PERSONAL", owner, null, List.of(), null), owner);
            }
            case "PROJECT":
                assertProjectInWorkspace(projectId, workspaceId);
                return new ScopeResult(l, aggregation.resolve("PROJECT", requesterId, projectId, List.of(), null), projectId);
            case "TEAM":
                return new ScopeResult(l, teamFilter(requesterId, teamId, workspaceId), teamId);
            case "MANAGER":
                // A manager sees a team's aggregate, or — with no team selected — the whole workspace.
                if (teamId != null && !teamId.isBlank()) {
                    return new ScopeResult(l, teamFilter(requesterId, teamId, workspaceId), teamId);
                }
                return new ScopeResult(l, aggregation.resolve("ORG", requesterId, null, List.of(), workspaceId), null);
            case "ORG":
            default:
                return new ScopeResult(l, aggregation.resolve("ORG", requesterId, null, List.of(), workspaceId), null);
        }
    }

    private AggregationService.ScopeFilter teamFilter(String requesterId, String teamId, String workspaceId) {
        if (teamId == null || teamId.isBlank()) {
            return aggregation.resolve("TEAM", requesterId, null, List.of(), null); // matches nothing
        }
        // Tenant isolation: a team must belong to the caller's workspace (RB-40 §1) — otherwise a
        // LEAD in one workspace could read another tenant's aggregated metrics by guessing a team id.
        Team team = teams.findById(teamId)
            .orElseThrow(() -> ApiException.notFound("Team", teamId));
        if (team.getWorkspaceId() != null && !team.getWorkspaceId().equals(workspaceId)) {
            throw ApiException.forbidden("That team is not in this workspace.");
        }
        return aggregation.resolve("TEAM", requesterId, null, aggregation.parseProjectIds(team.getProjectIds()), null);
    }

    /** Tenant isolation: reject a projectId that does not belong to the caller's workspace (RB-40 §1). */
    private void assertProjectInWorkspace(String projectId, String workspaceId) {
        if (projectId == null || projectId.isBlank()) {
            return;
        }
        String ws = rbac.workspaceForProject(projectId);
        if (ws == null || !ws.equals(workspaceId)) {
            throw ApiException.forbidden("That project is not in this workspace.");
        }
    }

    /** The effective per-workspace privacy policy (or the framework default). */
    public WorkspaceKpiSettings settings(String workspaceId) {
        return settingsRepo.findById(workspaceId).orElseGet(() -> {
            WorkspaceKpiSettings s = new WorkspaceKpiSettings();
            s.setWorkspaceId(workspaceId);
            s.setMinAggregationSize(KpiPrivacyService.DEFAULT_MIN_AGGREGATION_SIZE);
            s.setIndividualComparisonLocked(true);
            return s;
        });
    }

    /**
     * The effective metric catalog for a workspace: the workspace's own active definitions, plus the
     * global default-catalog metrics that the workspace has not overridden by key.
     */
    /**
     * Save a workspace's privacy policy. The policy may only be made <em>stricter</em> than the
     * framework default (a larger aggregation floor); attempts to weaken it below the default are
     * clamped, so a workspace can never expose individuals more readily than the product allows.
     */
    public WorkspaceKpiSettings saveSettings(String workspaceId, Integer minSize, Boolean locked) {
        WorkspaceKpiSettings s = settings(workspaceId);
        s.setWorkspaceId(workspaceId);
        if (minSize != null) {
            s.setMinAggregationSize(Math.max(KpiPrivacyService.DEFAULT_MIN_AGGREGATION_SIZE, minSize));
        }
        if (locked != null) {
            s.setIndividualComparisonLocked(locked);
        }
        s.setUpdatedAt(OffsetDateTime.now());
        return settingsRepo.save(s);
    }

    public List<MetricDefinition> catalog(String workspaceId) {
        List<MetricDefinition> result = new ArrayList<>(
            definitions.findByWorkspaceIdAndActiveTrue(workspaceId));
        java.util.Set<String> overridden = new java.util.HashSet<>();
        for (MetricDefinition d : result) {
            overridden.add(d.getMetricKey());
        }
        for (MetricDefinition d : definitions.findByWorkspaceIdIsNullOrderByNameAsc()) {
            if (Boolean.TRUE.equals(d.getActive()) && !overridden.contains(d.getMetricKey())) {
                result.add(d);
            }
        }
        return result;
    }

    /** Build a complete layered view: privacy-checked, scoped, suppressed where required. */
    public Map<String, Object> buildView(String layer, String requesterId, String workspaceId,
                                          String projectId, String teamId, String targetUserId) {
        ScopeResult scope = resolveScope(layer, requesterId, workspaceId, projectId, teamId, targetUserId);
        WorkspaceKpiSettings cfg = settings(workspaceId);
        int minSize = privacy.effectiveMinAggregationSize(cfg);

        KpiComputationService.Computed computed = computation.compute(scope.filter());
        boolean suppressed = privacy.mustSuppress(scope.layer(), computed.contributors(), minSize);

        List<MetricDefinition> catalog = catalog(workspaceId);
        List<Map<String, Object>> metrics = new ArrayList<>();
        for (MetricDefinition def : catalog) {
            if (!layerAllows(scope.layer(), def.getMinLayer())) {
                continue; // personal-only metrics are not surfaced on aggregated views (and vice-versa)
            }
            metrics.add(metricRow(def, computed.values(), suppressed));
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("layer", scope.layer());
        out.put("scopeRef", scope.scopeRef());
        out.put("contributors", computed.contributors());
        out.put("suppressed", suppressed);
        out.put("metrics", metrics);
        out.put("privacy", privacyBlock(scope.layer(), cfg, minSize, suppressed));
        return out;
    }

    /** Team-health composite + the (deterministic-fallback) narrative for a scope. */
    public Map<String, Object> teamHealth(String layer, String requesterId, String workspaceId,
                                           String projectId, String teamId) {
        ScopeResult scope = resolveScope(layer, requesterId, workspaceId, projectId, teamId, null);
        KpiComputationService.Computed computed = computation.compute(scope.filter());
        KpiComputationService.SprintInputs sp = computed.sprintInputs();

        double predictability = health.predictability(sp.commitmentAccuracies());
        double scopeStability = health.scopeStability(sp.committedPoints(), sp.addedPoints());
        double meanCycle = stats.mean(computed.cycleTimesDays());
        double meanLead = stats.mean(computed.leadTimesDays());
        double flow = meanLead <= 0 ? 0.0 : health.flowEfficiency(meanCycle, meanLead);
        TeamHealthService.TeamHealth current = health.compose(predictability, scopeStability, flow);

        TeamHealthNarrativeService.Narrative story = narrative.generate(current, null, sp.additionsCount());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("layer", scope.layer());
        out.put("scopeRef", scope.scopeRef());
        out.put("predictability", current.predictability());
        out.put("scopeStability", current.scopeStability());
        out.put("flowEfficiency", current.flowEfficiency());
        out.put("composite", current.composite());
        out.put("band", current.band());
        out.put("narrative", story.summary());
        out.put("highlights", story.highlights());
        out.put("narrativeSource", story.source());
        return out;
    }

    /**
     * Cycle-time distribution (histogram, median, P85, outliers) for a scope. {@code targetUserId} is
     * honored only on the PERSONAL layer and is gated by {@link KpiPrivacyService#assertCanViewPersonal}
     * inside {@link #resolveScope} — so one member cannot read another's individual distribution without
     * an active voluntary share, and it is rejected outright on any aggregated layer.
     */
    public Map<String, Object> cycleTimeDistribution(String layer, String requesterId, String workspaceId,
                                                      String projectId, String teamId, String targetUserId) {
        ScopeResult scope = resolveScope(layer, requesterId, workspaceId, projectId, teamId, targetUserId);
        KpiComputationService.Computed computed = computation.compute(scope.filter());
        CycleTimeStatsService.Distribution dist = stats.distribution(computed.cycleTimesDays());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("layer", scope.layer());
        out.put("median", dist.median());
        out.put("p85", dist.p85());
        out.put("mean", dist.mean());
        out.put("count", dist.count());
        out.put("histogram", dist.histogram());
        out.put("outlierThreshold", dist.outlierThreshold());
        out.put("outliers", computation.cycleTimeOutliers(scope.filter(), dist.outlierThreshold(), 10));
        return out;
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private boolean layerAllows(String layer, String minLayer) {
        // PERSONAL view shows only personal-safe metrics; aggregated views show team-and-up metrics.
        boolean personalView = "PERSONAL".equals(privacy.normalizeLayer(layer));
        if (personalView) {
            return "PERSONAL".equalsIgnoreCase(minLayer);
        }
        return true;
    }

    private Map<String, Object> metricRow(MetricDefinition def, Map<String, Double> values, boolean suppressed) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", def.getMetricKey());
        m.put("name", def.getName());
        m.put("description", def.getDescription());
        m.put("category", def.getCategory());
        m.put("aggregation", def.getAggregation());
        m.put("unit", def.getUnit());
        m.put("higherIsBetter", def.getHigherIsBetter());
        boolean available = values.containsKey(def.getMetricKey());
        if (!available) {
            m.put("available", false);
            m.put("value", null);
            m.put("unavailableReason",
                KpiComputationService.UNAVAILABLE.getOrDefault(def.getMetricKey(), "Not yet measured."));
        } else if (suppressed) {
            m.put("available", true);
            m.put("value", null);
            m.put("suppressed", true);
        } else {
            m.put("available", true);
            m.put("value", values.get(def.getMetricKey()));
        }
        return m;
    }

    private Map<String, Object> privacyBlock(String layer, WorkspaceKpiSettings cfg, int minSize, boolean suppressed) {
        Map<String, Object> p = new LinkedHashMap<>();
        boolean aggregated = privacy.isAggregatedLayer(layer);
        p.put("aggregated", aggregated);
        p.put("individualComparisonLocked", Boolean.TRUE.equals(cfg.getIndividualComparisonLocked()));
        p.put("minAggregationSize", minSize);
        if (aggregated) {
            p.put("message", suppressed
                ? "Metrics are hidden: too few contributors to show without identifying individuals."
                : "Aggregated view. Individual engineer data is never shown here — by design.");
        } else {
            p.put("message", "Your personal metrics. Visible only to you unless you choose to share them.");
        }
        return p;
    }
}
