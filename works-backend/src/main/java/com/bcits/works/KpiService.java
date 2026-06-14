package com.bcits.works;

import com.fasterxml.jackson.databind.ObjectMapper;
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

    /**
     * Tier at/above which leadership-sensitive fields (e.g. {@code businessValue}) are visible —
     * the same field-level-security convention BQL uses ({@code BqlController.SENSITIVE_FIELD_MIN_TIER}),
     * reused here so a custom metric can never become a back-door into a sensitive field a lower-tier
     * caller may not see (RB-40 §1, spec 06 §5.5).
     */
    static final int SENSITIVE_FIELD_MIN_TIER = 3; // LEAD+

    /** Sentinel caller for trusted backend jobs (no human user) — full field visibility (RB-40 §1). */
    private static final String SYSTEM_CALLER = "__system__";

    private final WorkItemRepository workItems;
    private final ProjectRepository projects;
    private final TeamRepository teams;
    private final MetricDefinitionRepository definitions;
    private final MetricSnapshotRepository snapshots;
    private final MetricShareRepository shares;
    private final AiControlPlaneService controlPlane;
    private final BqlCompiler bqlCompiler;
    private final BqlQueryExecutor bqlExecutor;
    private final RbacService rbac;
    private final ObjectMapper json = new ObjectMapper();

    public KpiService(WorkItemRepository workItems, ProjectRepository projects, TeamRepository teams,
                      MetricDefinitionRepository definitions, MetricSnapshotRepository snapshots,
                      MetricShareRepository shares, AiControlPlaneService controlPlane,
                      BqlCompiler bqlCompiler, BqlQueryExecutor bqlExecutor, RbacService rbac) {
        this.workItems = workItems;
        this.projects = projects;
        this.teams = teams;
        this.definitions = definitions;
        this.snapshots = snapshots;
        this.shares = shares;
        this.controlPlane = controlPlane;
        this.bqlCompiler = bqlCompiler;
        this.bqlExecutor = bqlExecutor;
        this.rbac = rbac;
    }

    /** True when the caller's workspace tier may see leadership-sensitive fields (field-level security). */
    private boolean canSeeSensitive(String workspaceId, String userId) {
        if (SYSTEM_CALLER.equals(userId)) {
            return true; // trusted backend job, no human caller
        }
        return userId != null && rbac.getUserTier(userId, workspaceId) >= SENSITIVE_FIELD_MIN_TIER;
    }

    /**
     * Does this definition reference any field the caller's tier may not see? A custom metric carries
     * field references in two places — its {@code sourceField} (built-in column alias) and its
     * {@code bqlFormula} (a BQL expression). Both are resolved through the closed
     * {@link BqlFieldRegistry} allow-list under the caller's field-security context; if either touches
     * a sensitive field the caller cannot see, the metric is field-restricted (RB-40 §1).
     */
    private boolean referencesForbiddenField(MetricDefinition def, BqlContext ctx) {
        String src = def.getSourceField();
        if (src != null && !src.isBlank()) {
            try {
                BqlFieldRegistry.resolve(src, ctx);
            } catch (BqlException e) {
                // Unknown source fields are tolerated (custom catalog keys); only a *forbidden*
                // (sensitive, gated) field restricts the metric.
                if (e.getMessage() != null && e.getMessage().startsWith("Field not permitted")) {
                    return true;
                }
            }
        }
        String formula = def.getBqlFormula();
        if (formula != null && !formula.isBlank()) {
            try {
                bqlCompiler.compileFor(formula, ctx);
            } catch (BqlException e) {
                if (e.getMessage() != null && e.getMessage().startsWith("Field not permitted")) {
                    return true;
                }
                // A malformed formula is not a field-security failure — leave it to the compile path.
            }
        }
        return false;
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
            requireShared(workspaceId, target, requesterId);
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
        out.add(metric(MetricCatalog.THROUGHPUT, doneCount(items), items.size()));
        out.add(metric(MetricCatalog.COMPLETION_RATE, completionRate(items), items.size()));
        out.add(metric(MetricCatalog.CYCLE_TIME, cycleTimeP85(items), doneCountInt(items)));
        out.add(metric(MetricCatalog.WIP, wipCount(items), items.size()));
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
        return applyTargetsAndCustomMetrics(workspaceId, SYSTEM_CALLER,
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
        List<Double> hours = done.stream().map(KpiService::cycleHours).collect(Collectors.toList());
        double median = MetricFormula.median(hours);
        double p85 = MetricFormula.percentile(hours, 85);
        int[] edges = {24, 72, 168, 336};   // 1d, 3d, 1w, 2w
        List<Integer> buckets = bucketize(hours, edges);
        List<String> outliers = done.stream()
            .filter(w -> cycleHours(w) > p85 && p85 > 0)
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

    /**
     * Metric definitions visible to the caller. Field-level security (RB-40 §1): a definition built
     * over a sensitive field (its {@code sourceField} or {@code bqlFormula}) is filtered out for a
     * caller whose tier is below {@link #SENSITIVE_FIELD_MIN_TIER} — listing must not leak the
     * existence of sensitive-field-based metrics to low-tier callers.
     */
    public List<MetricDefinition> listDefinitions(String workspaceId, String callerId) {
        BqlContext ctx = BqlContext.forUser(callerId, canSeeSensitive(workspaceId, callerId));
        return definitions.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
            .filter(d -> !referencesForbiddenField(d, ctx))
            .collect(Collectors.toList());
    }

    @Transactional
    public MetricDefinition createDefinition(String workspaceId, String creatorId, MetricDefinition def) {
        // Safe formula + privacy validation: custom metrics aggregate only, never INDIVIDUAL.
        MetricFormula.validateDefinition(def.getPrimitive(), def.getScopeLevel());
        // Field-level security (RB-40 §1): a creator may not define a metric over a sensitive field
        // their own tier cannot see — that would launder a forbidden field into an aggregate they
        // (and every lower tier) can then read.
        BqlContext ctx = BqlContext.forUser(creatorId, canSeeSensitive(workspaceId, creatorId));
        if (referencesForbiddenField(def, ctx)) {
            throw ApiException.forbidden(
                "This metric references a field your role is not permitted to query "
                + "(field-level security, RB-40 §1).");
        }
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
            .map(KpiService::cycleHours).collect(Collectors.toList());
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

    /**
     * Cycle time in hours: how long the item took, not how old it is. For a <b>done</b> item we
     * measure from creation to the moment it last changed status ({@code statusChangedAt}, V74) — the
     * completion timestamp proxy — so a finished item's cycle time is stable and never grows with
     * wall-clock time. For an item that is still open (or that predates the status-timestamp backfill
     * and so has no {@code statusChangedAt}) we measure to now, giving its current age-in-flight.
     * This is the fix for the "cycle time keeps climbing forever" defect (RB-20 §4 honest metrics).
     */
    static double cycleHours(WorkItem w) {
        if (w.getCreatedAt() == null) {
            return 0;
        }
        OffsetDateTime end = (isDone(w) && w.getStatusChangedAt() != null)
            ? w.getStatusChangedAt()
            : OffsetDateTime.now();
        return Math.max(0, Duration.between(w.getCreatedAt(), end).toHours());
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
            List<MetricSnapshot> hist = snapshots
                .findByWorkspaceIdAndMetricKeyAndScopeLevelAndScopeIdOrderByPeriodAsc(
                    workspaceId, mv.key(), layer.scopeLevel(), scopeId);
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
        BqlContext ctx = BqlContext.forUser(callerId, canSeeSensitive(workspaceId, callerId));
        List<MetricDefinition> defs = definitions.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
            .filter(d -> !referencesForbiddenField(d, ctx))
            .collect(Collectors.toList());
        Map<String, MetricDefinition> defsByKey = defs.stream()
            .collect(Collectors.toMap(MetricDefinition::getMetricKey, d -> d, (a, b) -> a));

        // Re-evaluate status for catalog metrics that have a target set.
        List<MetricValue> updated = layer.metrics().stream().map(mv -> {
            MetricDefinition def = defsByKey.get(mv.key());
            if (def == null || def.getTarget() == null) return mv;
            String status = evaluateStatus(mv.value(), def.getTarget(), mv.higherIsBetter());
            return new MetricValue(mv.key(), mv.label(), mv.value(), mv.unit(),
                mv.higherIsBetter(), mv.sampleSize(), status, mv.trend());
        }).collect(Collectors.toList());

        // Append custom metrics with bqlFormula (unification layer: BQL in KPI definitions, RB-10 §6).
        List<MetricValue> custom = new ArrayList<>();
        for (MetricDefinition def : defs) {
            if (def.getBqlFormula() == null || def.getBqlFormula().isBlank()) continue;
            if (defsByKey.containsKey(def.getMetricKey()) && updated.stream().anyMatch(m -> m.key().equals(def.getMetricKey()))) continue;
            try {
                // Compile + execute the workspace-scoped count centrally (RB-40 §1, advances #243);
                // compiling under the caller's field-security context means a sensitive-field formula
                // throws here for an under-tier caller (defs already filtered above).
                long count = bqlExecutor.countScoped(workspaceId, def.getBqlFormula(), ctx);
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
