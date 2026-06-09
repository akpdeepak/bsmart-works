package com.bcits.works;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The KPI engine (iteration 12, Cap L) — layered metrics with privacy guardrails (commitment 4,
 * RB-40 §1). Individual data is private by default; team / project / org views are aggregated; and
 * the <b>manager view can never drill into an individual</b> — the manager methods simply do not
 * accept a user id, and {@link #personal} refuses to return another user's metrics unless that user
 * has voluntarily shared them. Privacy is enforced here, in the service, not in the UI.
 *
 * <p>Computations are deterministic over workspace-scoped work items (RB-40 §1). The pure aggregation
 * helpers live in {@link MetricFormula}; the per-scope helpers here are static so they are
 * unit-testable without a database (RB-10 §7). The AI team-health narrative routes through the one
 * control plane and falls back to a deterministic summary (RB-40 §2).
 */
@Service
public class KpiService {

    private static final String DONE = "done";
    private static final List<String> WIP_STATUSES = List.of("in progress", "in review", "doing", "qa", "testing");

    private final WorkItemRepository workItems;
    private final ProjectRepository projects;
    private final TeamRepository teams;
    private final MetricDefinitionRepository definitions;
    private final MetricSnapshotRepository snapshots;
    private final MetricShareRepository shares;
    private final AiControlPlaneService controlPlane;
    private final JdbcTemplate jdbc;
    private final BqlCompiler bqlCompiler;
    private final ObjectMapper json = new ObjectMapper();

    public KpiService(WorkItemRepository workItems, ProjectRepository projects, TeamRepository teams,
                      MetricDefinitionRepository definitions, MetricSnapshotRepository snapshots,
                      MetricShareRepository shares, AiControlPlaneService controlPlane,
                      JdbcTemplate jdbc, BqlCompiler bqlCompiler) {
        this.workItems = workItems;
        this.projects = projects;
        this.teams = teams;
        this.definitions = definitions;
        this.snapshots = snapshots;
        this.shares = shares;
        this.controlPlane = controlPlane;
        this.jdbc = jdbc;
        this.bqlCompiler = bqlCompiler;
    }

    // ── Public value types ───────────────────────────────────────────────────────

    /** {@code status} is ON_TRACK / AT_RISK / OFF_TRACK when a numeric target is set; null otherwise. */
    public record MetricValue(String key, String label, double value, String unit,
                              boolean higherIsBetter, int sampleSize, String status) { }

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
            requireShared(workspaceId, target, requesterId);
        }
        List<WorkItem> mine = scopedItems(workspaceId).stream()
            .filter(w -> target.equals(w.getAssigneeId()))
            .collect(Collectors.toList());
        List<MetricValue> metrics = personalMetrics(mine);
        String note = target.equals(requesterId)
            ? "Private — visible only to you unless you choose to share."
            : "Shared with you voluntarily by the owner.";
        return applyTargetsAndCustomMetrics(workspaceId,
            new Layer("INDIVIDUAL", target, "Personal", metrics, note));
    }

    static List<MetricValue> personalMetrics(List<WorkItem> items) {
        List<MetricValue> out = new ArrayList<>();
        out.add(metric(MetricCatalog.THROUGHPUT, doneCount(items), items.size()));
        out.add(metric(MetricCatalog.COMPLETION_RATE, completionRate(items), items.size()));
        out.add(metric(MetricCatalog.CYCLE_TIME, cycleTimeP85(items), doneCountInt(items)));
        out.add(metric(MetricCatalog.WIP, wipCount(items), items.size()));
        return out;
    }

    // ── Team / Project / Org aggregated views (no individual breakdown) ────────────

    public Layer team(String workspaceId, String teamId) {
        Team t = teams.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
            .filter(x -> x.getId().equals(teamId)).findFirst()
            .orElseThrow(() -> ApiException.notFound("Team", teamId));
        List<WorkItem> items = teamItems(workspaceId, t);
        return applyTargetsAndCustomMetrics(workspaceId,
            new Layer("TEAM", teamId, t.getName(), aggregateMetrics(items),
                "Aggregated — no individual breakdown (privacy by design.)"));
    }

    public Layer project(String workspaceId, String projectId) {
        Project p = projects.findByWorkspaceId(workspaceId).stream()
            .filter(x -> x.getId().equals(projectId)).findFirst()
            .orElseThrow(() -> ApiException.notFound("Project", projectId));
        List<WorkItem> items = workItems.findByProjectId(projectId);
        return applyTargetsAndCustomMetrics(workspaceId,
            new Layer("PROJECT", projectId, p.getName(), aggregateMetrics(items),
                "Aggregated across the project's contributing teams."));
    }

    /** Manager view: aggregated metrics per team. Deliberately accepts no user id — there is no API
     *  path to an individual's numbers from here (RB-40 §1, commitment 4). */
    public List<Layer> manager(String workspaceId) {
        return teams.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
            .map(t -> new Layer("TEAM", t.getId(), t.getName(), aggregateMetrics(teamItems(workspaceId, t)),
                "Aggregated — individual engineer comparison is unavailable by design."))
            .collect(Collectors.toList());
    }

    public Layer org(String workspaceId) {
        List<WorkItem> items = scopedItems(workspaceId);
        return applyTargetsAndCustomMetrics(workspaceId,
            new Layer("ORG", null, "Organization", aggregateMetrics(items),
                "Organization-wide rollup — fully aggregated."));
    }

    static List<MetricValue> aggregateMetrics(List<WorkItem> items) {
        List<MetricValue> out = new ArrayList<>();
        out.add(metric(MetricCatalog.VELOCITY, velocity(items), items.size()));
        out.add(metric(MetricCatalog.COMMITMENT_ACCURACY, completionRate(items), items.size()));
        out.add(metric(MetricCatalog.CYCLE_TIME, cycleTimeP85(items), doneCountInt(items)));
        out.add(metric(MetricCatalog.WIP, wipCount(items), items.size()));
        out.add(metric(MetricCatalog.BUG_ESCAPE, bugEscapeRate(items), items.size()));
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
        double predictability = completionRate(items);
        double scopeStability = scopeStability(items);
        double flowEfficiency = flowEfficiency(items);
        double overall = MetricFormula.round1((predictability + scopeStability + flowEfficiency) / 3.0);
        List<String> bands = List.of(
            "predictability:" + band(predictability),
            "scopeStability:" + band(scopeStability),
            "flowEfficiency:" + band(flowEfficiency));
        return new HealthComposite(teamId, predictability, scopeStability, flowEfficiency, overall, bands);
    }

    public record Distribution(double median, double p85, List<Integer> buckets, List<String> outliers) { }

    public Distribution distribution(String workspaceId, String scopeLevel, String scopeId) {
        List<WorkItem> items = scopeItems(workspaceId, scopeLevel, scopeId);
        List<WorkItem> done = items.stream().filter(KpiService::isDone).collect(Collectors.toList());
        List<Double> hours = done.stream().map(KpiService::ageHours).collect(Collectors.toList());
        double median = MetricFormula.median(hours);
        double p85 = MetricFormula.percentile(hours, 85);
        int[] edges = {24, 72, 168, 336};   // 1d, 3d, 1w, 2w
        List<Integer> buckets = bucketize(hours, edges);
        List<String> outliers = done.stream()
            .filter(w -> ageHours(w) > p85 && p85 > 0)
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
            h.overall(), h.predictability(), band(h.predictability()),
            h.scopeStability(), band(h.scopeStability()), h.flowEfficiency(), band(h.flowEfficiency()));
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.KPI_NARRATIVE,
            "Summarise team health for " + teamId, deterministic, null, inContext));
        String text = out.fallback() ? deterministic : out.text();
        return new Narrative(text, out.usedAi(), out.fallback(), out.policyState());
    }

    // ── Metric definitions (catalog + custom, safe formula builder) ────────────────

    public List<Map<String, Object>> catalog() {
        return MetricCatalog.all().stream().map(m -> Map.<String, Object>of(
            "key", m.key(), "label", m.label(), "primitive", m.primitive(), "unit", m.unit(),
            "scopeLevel", m.scopeLevel(), "higherIsBetter", m.higherIsBetter(),
            "privateByDefault", m.privateByDefault())).collect(Collectors.toList());
    }

    public List<MetricDefinition> listDefinitions(String workspaceId) {
        return definitions.findByWorkspaceIdOrderByNameAsc(workspaceId);
    }

    @Transactional
    public MetricDefinition createDefinition(String workspaceId, String creatorId, MetricDefinition def) {
        // Safe formula + privacy validation: custom metrics aggregate only, never INDIVIDUAL.
        MetricFormula.validateDefinition(def.getPrimitive(), def.getScopeLevel());
        def.setId("MD-" + shortId());
        def.setWorkspaceId(workspaceId);
        def.setPrimitive(MetricFormula.normalizePrimitive(def.getPrimitive()));
        def.setScopeLevel(MetricFormula.normalizeScope(def.getScopeLevel()));
        def.setBuiltIn(false);
        def.setCreatedBy(creatorId);
        OffsetDateTime now = OffsetDateTime.now();
        def.setCreatedAt(now);
        def.setUpdatedAt(now);
        return definitions.save(def);
    }

    // ── Immutable snapshots ────────────────────────────────────────────────────────

    @Transactional
    public MetricSnapshot snapshot(String workspaceId, String metricKey, String scopeLevel,
                                   String scopeId, String period, double value, int sampleSize) {
        MetricSnapshot s = new MetricSnapshot();
        s.setId("MS-" + shortId());
        s.setWorkspaceId(workspaceId);
        s.setMetricKey(metricKey);
        s.setScopeLevel(scopeLevel);
        s.setScopeId(scopeId);
        s.setPeriod(period);
        s.setValue(value);
        s.setSampleSize(sampleSize);
        s.setCreatedAt(OffsetDateTime.now());
        return snapshots.save(s);
    }

    public List<MetricSnapshot> history(String workspaceId, String metricKey, String scopeLevel, String scopeId) {
        return snapshots.findByWorkspaceIdAndMetricKeyAndScopeLevelAndScopeIdOrderByPeriodAsc(
            workspaceId, metricKey, scopeLevel, scopeId == null ? "" : scopeId);
    }

    // ── Voluntary sharing ──────────────────────────────────────────────────────────

    @Transactional
    public MetricShare share(String workspaceId, String ownerId, String viewerId) {
        if (ownerId.equals(viewerId)) {
            throw ApiException.badRequest("INVALID_SHARE", "You already see your own metrics.");
        }
        MetricShare existing = shares.findByWorkspaceIdAndOwnerUserIdAndViewerUserId(workspaceId, ownerId, viewerId)
            .orElse(null);
        if (existing != null) {
            return existing;
        }
        MetricShare s = new MetricShare();
        s.setId("MSH-" + shortId());
        s.setWorkspaceId(workspaceId);
        s.setOwnerUserId(ownerId);
        s.setViewerUserId(viewerId);
        s.setCreatedAt(OffsetDateTime.now());
        return shares.save(s);
    }

    @Transactional
    public void unshare(String workspaceId, String ownerId, String viewerId) {
        shares.findByWorkspaceIdAndOwnerUserIdAndViewerUserId(workspaceId, ownerId, viewerId)
            .ifPresent(shares::delete);
    }

    public List<MetricShare> sharesByOwner(String workspaceId, String ownerId) {
        return shares.findByWorkspaceIdAndOwnerUserId(workspaceId, ownerId);
    }

    private void requireShared(String workspaceId, String ownerId, String viewerId) {
        boolean shared = shares.findByWorkspaceIdAndOwnerUserIdAndViewerUserId(workspaceId, ownerId, viewerId).isPresent();
        if (!shared) {
            throw ApiException.forbidden(
                "Individual metrics are private. Managers cannot drill into individuals; the owner "
                + "must voluntarily share them (RB-40 §1).");
        }
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Pure deterministic computation helpers — unit-testable in isolation
    // ══════════════════════════════════════════════════════════════════════════════

    static boolean isDone(WorkItem w) {
        return w.getStatus() != null && w.getStatus().trim().toLowerCase(Locale.ROOT).equals(DONE);
    }

    static boolean isWip(WorkItem w) {
        String s = w.getStatus() == null ? "" : w.getStatus().trim().toLowerCase(Locale.ROOT);
        return WIP_STATUSES.contains(s);
    }

    static double velocity(List<WorkItem> items) {
        return MetricFormula.round1(items.stream()
            .filter(KpiService::isDone)
            .mapToInt(w -> w.getStoryPoints() == null ? 0 : w.getStoryPoints())
            .sum());
    }

    static double doneCount(List<WorkItem> items) {
        return doneCountInt(items);
    }

    static int doneCountInt(List<WorkItem> items) {
        return (int) items.stream().filter(KpiService::isDone).count();
    }

    static double completionRate(List<WorkItem> items) {
        return MetricFormula.ratio(doneCountInt(items), items.size());
    }

    static double wipCount(List<WorkItem> items) {
        return items.stream().filter(KpiService::isWip).count();
    }

    static double bugEscapeRate(List<WorkItem> items) {
        long bugs = items.stream().filter(w -> "Bug".equalsIgnoreCase(nv(w.getType()))).count();
        return MetricFormula.ratio(bugs, items.size());
    }

    static double cycleTimeP85(List<WorkItem> items) {
        List<Double> hours = items.stream().filter(KpiService::isDone)
            .map(KpiService::ageHours).collect(Collectors.toList());
        return MetricFormula.percentile(hours, 85);
    }

    /** Scope stability: share of items NOT added late (no sprint reassignment proxy) — higher is better. */
    static double scopeStability(List<WorkItem> items) {
        if (items.isEmpty()) {
            return 0;
        }
        long stable = items.stream().filter(w -> w.getSprintId() != null).count();
        // Proxy: items planned into a sprint vs total. Empty backlog churn → treat as fully stable.
        return stable == 0 ? 100.0 : MetricFormula.ratio(stable, items.size());
    }

    /** Flow efficiency: share of work that is moving (done or WIP) rather than stuck in backlog. */
    static double flowEfficiency(List<WorkItem> items) {
        if (items.isEmpty()) {
            return 0;
        }
        long flowing = items.stream().filter(w -> isDone(w) || isWip(w)).count();
        return MetricFormula.ratio(flowing, items.size());
    }

    static String band(double percent) {
        if (percent >= 80) {
            return "healthy";
        }
        return percent >= 60 ? "watch" : "risk";
    }

    static List<Integer> bucketize(List<Double> hours, int[] edges) {
        int[] counts = new int[edges.length + 1];
        for (Double h : hours) {
            if (h == null) {
                continue;
            }
            int b = edges.length;
            for (int i = 0; i < edges.length; i++) {
                if (h <= edges[i]) {
                    b = i;
                    break;
                }
            }
            counts[b]++;
        }
        List<Integer> out = new ArrayList<>();
        for (int c : counts) {
            out.add(c);
        }
        return out;
    }

    private static double ageHours(WorkItem w) {
        if (w.getCreatedAt() == null) {
            return 0;
        }
        return Math.max(0, Duration.between(w.getCreatedAt(), OffsetDateTime.now()).toHours());
    }

    private static MetricValue metric(String key, double value, int sampleSize) {
        MetricCatalog.Metric m = MetricCatalog.get(key);
        return new MetricValue(key, m == null ? key : m.label(), MetricFormula.round1(value),
            m == null ? "" : m.unit(), m != null && m.higherIsBetter(), sampleSize, null);
    }

    /** Evaluates ON_TRACK / AT_RISK / OFF_TRACK against a numeric target (RB-10 §6 KPI evaluation). */
    static String evaluateStatus(double actual, Double target, boolean higherIsBetter) {
        if (target == null || target <= 0) return null;
        double denom = higherIsBetter ? target : Math.max(actual, 0.001);
        double numer = higherIsBetter ? actual : target;
        double ratio = numer / denom;
        if (ratio >= 1.0) return "ON_TRACK";
        if (ratio >= 0.75) return "AT_RISK";
        return "OFF_TRACK";
    }

    /**
     * Applies workspace-level targets to produce ON_TRACK/AT_RISK/OFF_TRACK status on each metric,
     * and appends any custom BQL-formula metrics defined for this workspace (RB-10 §6).
     */
    private Layer applyTargetsAndCustomMetrics(String workspaceId, Layer layer) {
        List<MetricDefinition> defs = definitions.findByWorkspaceIdOrderByNameAsc(workspaceId);
        Map<String, MetricDefinition> defsByKey = defs.stream()
            .collect(Collectors.toMap(MetricDefinition::getMetricKey, d -> d, (a, b) -> a));

        // Re-evaluate status for catalog metrics that have a target set.
        List<MetricValue> updated = layer.metrics().stream().map(mv -> {
            MetricDefinition def = defsByKey.get(mv.key());
            if (def == null || def.getTarget() == null) return mv;
            String status = evaluateStatus(mv.value(), def.getTarget(), mv.higherIsBetter());
            return new MetricValue(mv.key(), mv.label(), mv.value(), mv.unit(),
                mv.higherIsBetter(), mv.sampleSize(), status);
        }).collect(Collectors.toList());

        // Append custom metrics with bqlFormula (unification layer: BQL in KPI definitions, RB-10 §6).
        List<MetricValue> custom = new ArrayList<>();
        for (MetricDefinition def : defs) {
            if (def.getBqlFormula() == null || def.getBqlFormula().isBlank()) continue;
            if (defsByKey.containsKey(def.getMetricKey()) && updated.stream().anyMatch(m -> m.key().equals(def.getMetricKey()))) continue;
            try {
                BqlCompiler.Compiled compiled = bqlCompiler.compile(def.getBqlFormula(), null);
                String countSql = "SELECT COUNT(*) FROM work_items WHERE workspace_id = ? AND deleted_at IS NULL"
                    + (compiled.sql().isBlank() ? "" : " AND (" + compiled.sql() + ")");
                List<Object> params = new ArrayList<>();
                params.add(workspaceId);
                params.addAll(compiled.params());
                long count = jdbc.queryForObject(countSql, Long.class, params.toArray());
                boolean hib = Boolean.TRUE.equals(def.getHigherIsBetter());
                String status = evaluateStatus(count, def.getTarget(), hib);
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

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private static String nv(Object o) {
        return o == null ? "" : o.toString();
    }
}
