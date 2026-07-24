package com.bcits.works.reporting;

import com.bcits.works.ai.api.AiControlPlaneService;
import com.bcits.works.BqlQueryExecutor;
import com.bcits.works.auth.RbacService;
import com.bcits.works.projects.api.Project;
import com.bcits.works.projects.api.ProjectRepository;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.BqlCompiler;
import com.bcits.works.workitems.api.WorkItem;
import com.bcits.works.workitems.api.WorkItemRepository;
import com.bcits.works.workspaces.api.Team;
import com.bcits.works.workspaces.api.TeamRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * KPI engine behaviour (iteration 12, Cap L). The headline guarantee is privacy: a caller cannot
 * read another user's individual metrics unless that user has voluntarily shared, and the manager
 * view exposes no per-individual path at all (RB-40 §1, commitment 4). Pure helpers are also
 * verified directly (RB-10 §7).
 */
@Tag("unit")
class KpiServiceTest {

    private static final String WS = "ws-1";
    private static final String ME = "user-me";
    private static final String OTHER = "user-other";

    private final WorkItemRepository workItems = mock(WorkItemRepository.class);
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final TeamRepository teams = mock(TeamRepository.class);
    private final MetricDefinitionRepository definitions = mock(MetricDefinitionRepository.class);
    private final MetricSnapshotRepository snapshots = mock(MetricSnapshotRepository.class);
    private final MetricShareRepository shares = mock(MetricShareRepository.class);
    private final AiControlPlaneService controlPlane = mock(AiControlPlaneService.class);
    private final BqlCompiler bqlCompiler = mock(BqlCompiler.class);
    private final BqlQueryExecutor bqlExecutor = mock(BqlQueryExecutor.class);
    private final RbacService rbac = mock(RbacService.class);

    private final MetricDefinitionService metricDefs = new MetricDefinitionService(
        definitions, snapshots, shares, bqlCompiler, rbac);
    private final KpiService kpi = new KpiService(workItems, projects, teams,
        controlPlane, bqlExecutor, metricDefs);

    // By default, return an empty definitions list so applyTargetsAndCustomMetrics is a no-op.
    { when(definitions.findByWorkspaceIdOrderByNameAsc(WS)).thenReturn(List.of()); }

    private WorkItem item(String id, String assignee, String status, Integer points, String type) {
        WorkItem w = new WorkItem();
        w.setId(id);
        w.setProjectId("PROJ-1");
        w.setAssigneeId(assignee);
        w.setStatus(status);
        w.setStoryPoints(points);
        w.setType(type);
        w.setCreatedAt(OffsetDateTime.now().minusDays(2));
        return w;
    }

    private Project project() {
        Project p = new Project();
        p.setId("PROJ-1");
        p.setWorkspaceId(WS);
        p.setName("Portal");
        return p;
    }

    // ── privacy: personal view ─────────────────────────────────────────────────────

    @Test
    void personal_self_isAllowed() {
        when(projects.findByWorkspaceId(WS)).thenReturn(List.of(project()));
        when(workItems.findByProjectId("PROJ-1")).thenReturn(List.of(
            item("A-1", ME, "Done", 3, "Story"), item("A-2", ME, "In Progress", 2, "Bug")));

        KpiService.Layer layer = kpi.personal(WS, ME, null);

        assertThat(layer.scopeLevel()).isEqualTo("INDIVIDUAL");
        assertThat(layer.scopeId()).isEqualTo(ME);
        assertThat(layer.metrics()).isNotEmpty();
    }

    @Test
    void personal_otherUserWithoutShare_isForbidden() {
        when(shares.findByWorkspaceIdAndOwnerUserIdAndViewerUserId(WS, OTHER, ME))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> kpi.personal(WS, ME, OTHER))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus().value()).isEqualTo(403));
    }

    @Test
    void personal_otherUserWithShare_isAllowed() {
        MetricShare share = new MetricShare();
        share.setWorkspaceId(WS);
        share.setOwnerUserId(OTHER);
        share.setViewerUserId(ME);
        when(shares.findByWorkspaceIdAndOwnerUserIdAndViewerUserId(WS, OTHER, ME))
            .thenReturn(Optional.of(share));
        when(projects.findByWorkspaceId(WS)).thenReturn(List.of(project()));
        when(workItems.findByProjectId("PROJ-1")).thenReturn(List.of(item("A-1", OTHER, "Done", 5, "Story")));

        KpiService.Layer layer = kpi.personal(WS, ME, OTHER);
        assertThat(layer.scopeId()).isEqualTo(OTHER);
        assertThat(layer.privacyNote()).contains("Shared");
    }

    @Test
    void share_refusesSelfShare() {
        assertThatThrownBy(() -> metricDefs.share(WS, ME, ME)).isInstanceOf(ApiException.class);
    }

    // ── custom definition validation ────────────────────────────────────────────────

    @Test
    void createDefinition_rejectsIndividualScope() {
        MetricDefinition def = new MetricDefinition();
        def.setPrimitive("AVG");
        def.setScopeLevel("INDIVIDUAL");
        assertThatThrownBy(() -> metricDefs.createDefinition(WS, ME, def)).isInstanceOf(ApiException.class);
    }

    // ── narrative falls back deterministically ───────────────────────────────────────

    @Test
    void narrative_usesDeterministicSummaryOnFallback() {
        Team t = new Team();
        t.setId("TEAM-1");
        t.setName("WEB");
        t.setProjectIds("[]");
        when(teams.findByWorkspaceIdOrderByNameAsc(WS)).thenReturn(List.of(t));
        when(projects.findByWorkspaceId(WS)).thenReturn(List.of(project()));
        when(workItems.findByProjectId("PROJ-1")).thenReturn(List.of(item("A-1", ME, "Done", 3, "Story")));
        when(controlPlane.invoke(any())).thenReturn(
            AiControlPlaneService.AiOutcome.fallback("DISABLED_WORKSPACE"));

        KpiService.Narrative n = kpi.narrative(WS, ME, "TEAM-1", true);
        assertThat(n.fallback()).isTrue();
        assertThat(n.text()).contains("Team health");
    }

    @Test
    void teamsAndProjectsForSystem_produceScopedLayersForTheSnapshotWriter() {
        // TD-025: the scheduler now writes TEAM + PROJECT snapshots (not just ORG) so trends light up
        // at every aggregated layer. These system rollups carry a non-null scopeId per scope.
        Team t = new Team();
        t.setId("TEAM-1");
        t.setName("WEB");
        t.setProjectIds("[\"PROJ-1\"]");
        when(teams.findByWorkspaceIdOrderByNameAsc(WS)).thenReturn(List.of(t));
        when(projects.findByWorkspaceId(WS)).thenReturn(List.of(project()));
        when(workItems.findByProjectId("PROJ-1")).thenReturn(List.of(
            item("A-1", ME, "Done", 3, "Story"), item("A-2", ME, "In Progress", 2, "Story")));

        assertThat(kpi.teamsForSystem(WS)).singleElement().satisfies(l -> {
            assertThat(l.scopeLevel()).isEqualTo("TEAM");
            assertThat(l.scopeId()).isEqualTo("TEAM-1");
            assertThat(l.metrics()).isNotEmpty();
        });
        assertThat(kpi.projectsForSystem(WS)).singleElement().satisfies(l -> {
            assertThat(l.scopeLevel()).isEqualTo("PROJECT");
            assertThat(l.scopeId()).isEqualTo("PROJ-1");
            assertThat(l.metrics()).isNotEmpty();
        });
    }

    // ── pure computation helpers ─────────────────────────────────────────────────────

    @Test
    void velocity_sumsDoneStoryPoints() {
        List<WorkItem> items = List.of(
            item("A", ME, "Done", 3, "Story"),
            item("B", ME, "Done", 5, "Story"),
            item("C", ME, "In Progress", 8, "Story"));
        assertThat(KpiMetricCalculator.velocity(items)).isEqualTo(8.0);
    }

    @Test
    void completionRate_isDoneOverTotalPercent() {
        List<WorkItem> items = List.of(
            item("A", ME, "Done", 1, "Story"),
            item("B", ME, "Todo", 1, "Story"),
            item("C", ME, "Done", 1, "Story"),
            item("D", ME, "Todo", 1, "Story"));
        assertThat(KpiMetricCalculator.completionRate(items)).isEqualTo(50.0);
    }

    @Test
    void wipAndBugEscape_count() {
        List<WorkItem> items = List.of(
            item("A", ME, "In Progress", 1, "Story"),
            item("B", ME, "In Review", 1, "Bug"),
            item("C", ME, "Done", 1, "Bug"),
            item("D", ME, "Todo", 1, "Story"));
        assertThat(KpiMetricCalculator.wipCount(items)).isEqualTo(2.0);
        assertThat(KpiMetricCalculator.bugEscapeRate(items)).isEqualTo(50.0);
    }

    @Test
    void band_classifiesHealth() {
        assertThat(KpiMetricCalculator.band(85)).isEqualTo("healthy");
        assertThat(KpiMetricCalculator.band(70)).isEqualTo("watch");
        assertThat(KpiMetricCalculator.band(40)).isEqualTo("risk");
    }

    @Test
    void bucketize_distributesByEdges() {
        List<Double> hours = List.of(10.0, 50.0, 100.0, 400.0);
        List<Integer> buckets = KpiMetricCalculator.bucketize(hours, new int[]{24, 72, 168, 336});
        assertThat(buckets).containsExactly(1, 1, 1, 0, 1);
    }

    // ── tenant isolation: /distribution project scope (RB-40 §1) ───────────────────

    // ── KPI evaluation status (iter-12 gap fix) ───────────────────────────────────────

    @Test
    void evaluateStatus_higherIsBetter_computesBands() {
        assertThat(KpiMetricCalculator.evaluateStatus(100.0, 100.0, true)).isEqualTo("ON_TRACK");
        assertThat(KpiMetricCalculator.evaluateStatus(80.0, 100.0, true)).isEqualTo("AT_RISK");
        assertThat(KpiMetricCalculator.evaluateStatus(50.0, 100.0, true)).isEqualTo("OFF_TRACK");
    }

    @Test
    void evaluateStatus_lowerIsBetter_computesBands() {
        assertThat(KpiMetricCalculator.evaluateStatus(2.0, 2.0, false)).isEqualTo("ON_TRACK");
        assertThat(KpiMetricCalculator.evaluateStatus(2.5, 2.0, false)).isEqualTo("AT_RISK");  // 20% over
        assertThat(KpiMetricCalculator.evaluateStatus(5.0, 2.0, false)).isEqualTo("OFF_TRACK"); // 150% over
    }

    @Test
    void evaluateStatus_nullTarget_returnsNull() {
        assertThat(KpiMetricCalculator.evaluateStatus(50.0, null, true)).isNull();
        assertThat(KpiMetricCalculator.evaluateStatus(50.0, 0.0, true)).isNull();
    }

    @Test
    void personal_appliesTargetStatusWhenDefinitionHasTarget() {
        MetricDefinition def = new MetricDefinition();
        def.setMetricKey(MetricCatalog.THROUGHPUT);
        def.setTarget(5.0);
        def.setHigherIsBetter(true);
        when(definitions.findByWorkspaceIdOrderByNameAsc(WS)).thenReturn(List.of(def));
        when(projects.findByWorkspaceId(WS)).thenReturn(List.of(project()));
        // 8 done items out of 10 — throughput = 8 ≥ target 5 → ON_TRACK
        when(workItems.findByProjectId("PROJ-1")).thenReturn(List.of(
            item("A-1", ME, "Done", 3, "Story"), item("A-2", ME, "Done", 2, "Bug"),
            item("A-3", ME, "Done", 1, "Story"), item("A-4", ME, "Done", 2, "Story"),
            item("A-5", ME, "Done", 1, "Bug"), item("A-6", ME, "Done", 1, "Task"),
            item("A-7", ME, "Done", 1, "Story"), item("A-8", ME, "Done", 1, "Story"),
            item("A-9", ME, "In Progress", 2, "Story"), item("A-10", ME, "Todo", 1, "Story")));

        KpiService.Layer layer = kpi.personal(WS, ME, null);

        layer.metrics().stream()
            .filter(m -> m.key().equals(MetricCatalog.THROUGHPUT))
            .findFirst()
            .ifPresent(m -> assertThat(m.status()).isEqualTo("ON_TRACK"));
    }

    // ── cycle time uses completion, not wall-clock age (honest-metrics fix) ──────────

    @Test
    void cycleHours_doneItem_measuresToStatusChange_notNow() {
        // A done item created 10 days ago but completed 2 days after creation must report ~48h of
        // cycle time, NOT its 10-day age — otherwise cycle time climbs forever (RB-20 §4).
        WorkItem w = new WorkItem();
        w.setStatus("Done");
        w.setCreatedAt(OffsetDateTime.now().minusDays(10));
        w.setStatusChangedAt(OffsetDateTime.now().minusDays(8)); // completed 2 days after creation
        double hours = KpiMetricCalculator.cycleHours(w);
        assertThat(hours).isBetween(46.0, 50.0);
    }

    @Test
    void cycleHours_openItem_measuresAgeToNow() {
        // An in-flight item has no completion timestamp to anchor to → age-in-flight to now.
        WorkItem w = new WorkItem();
        w.setStatus("In Progress");
        w.setCreatedAt(OffsetDateTime.now().minusHours(30));
        assertThat(KpiMetricCalculator.cycleHours(w)).isBetween(28.0, 32.0);
    }

    @Test
    void cycleHours_doneItemWithoutStatusTimestamp_fallsBackToAge() {
        // Items predating the V74 status-timestamp backfill have no statusChangedAt → fall back to age.
        WorkItem w = new WorkItem();
        w.setStatus("Done");
        w.setCreatedAt(OffsetDateTime.now().minusHours(50));
        w.setStatusChangedAt(null);
        assertThat(KpiMetricCalculator.cycleHours(w)).isBetween(48.0, 52.0);
    }

    // ── vs-last-period trend from snapshot history (Cap L trends) ────────────────────

    private MetricSnapshot snap(String period, double value) {
        MetricSnapshot s = new MetricSnapshot();
        s.setMetricKey(MetricCatalog.VELOCITY);
        s.setScopeLevel("ORG");
        s.setPeriod(period);
        s.setValue(value);
        return s;
    }

    @Test
    void trendFor_higherIsBetter_risingIsImproving() {
        var hist = List.of(snap("2026-06-01T10", 30.0), snap("2026-06-02T10", 42.0));
        KpiService.MetricTrend t = KpiService.trendFor(hist, 42.0, true);
        assertThat(t).isNotNull();
        assertThat(t.delta()).isEqualTo(12.0);
        assertThat(t.previousValue()).isEqualTo(30.0);
        assertThat(t.direction()).isEqualTo("UP");
        assertThat(t.improving()).isTrue();
        assertThat(t.previousPeriod()).isEqualTo("2026-06-01T10");
    }

    @Test
    void trendFor_lowerIsBetter_risingIsWorsening() {
        var hist = List.of(snap("2026-06-01T10", 20.0), snap("2026-06-02T10", 35.0));
        KpiService.MetricTrend t = KpiService.trendFor(hist, 35.0, false); // e.g. cycle time up = bad
        assertThat(t.direction()).isEqualTo("UP");
        assertThat(t.improving()).isFalse();
    }

    @Test
    void trendFor_skipsSamePeriodAndNeedsAPrior() {
        // Only one distinct period → no comparison base → null (honest "no comparison yet").
        assertThat(KpiService.trendFor(List.of(snap("2026-06-02T10", 42.0)), 42.0, true)).isNull();
        assertThat(KpiService.trendFor(List.of(), 42.0, true)).isNull();
        // Repeated latest period collapses to the same period; the earlier distinct one is the base.
        var hist = List.of(snap("2026-06-01T10", 30.0), snap("2026-06-02T10", 40.0), snap("2026-06-02T11", 42.0));
        KpiService.MetricTrend t = KpiService.trendFor(hist, 42.0, true);
        assertThat(t.previousPeriod()).isEqualTo("2026-06-02T10");
        assertThat(t.delta()).isEqualTo(2.0);
    }

    @Test
    void org_attachesTrendFromSnapshotHistory() {
        when(projects.findByWorkspaceId(WS)).thenReturn(List.of(project()));
        when(workItems.findByProjectId("PROJ-1")).thenReturn(List.of(
            item("A-1", ME, "Done", 5, "Story"), item("A-2", ME, "Done", 3, "Story")));
        // ORG velocity history: 4 → current 8 (rising; higher is better → improving).
        when(snapshots.findByWorkspaceIdAndMetricKeyAndScopeLevelAndScopeIdOrderByPeriodAsc(
            WS, MetricCatalog.VELOCITY, "ORG", ""))
            .thenReturn(List.of(snap("2026-06-01T10", 4.0), snap("2026-06-02T10", 8.0)));

        KpiService.Layer layer = kpi.org(WS, ME);

        KpiService.MetricValue velocity = layer.metrics().stream()
            .filter(m -> m.key().equals(MetricCatalog.VELOCITY)).findFirst().orElseThrow();
        assertThat(velocity.trend()).isNotNull();
        assertThat(velocity.trend().direction()).isEqualTo("UP");
        assertThat(velocity.trend().improving()).isTrue();
    }

    @Test
    void trendFor_flatWhenUnchanged() {
        var hist = List.of(snap("2026-06-01T10", 42.0), snap("2026-06-02T10", 42.0));
        KpiService.MetricTrend t = KpiService.trendFor(hist, 42.0, true);
        assertThat(t.direction()).isEqualTo("FLAT");
        assertThat(t.improving()).isFalse();
    }

    // ── tenant isolation: /distribution project scope (RB-40 §1) ───────────────────

    @Test
    void distribution_projectScope_refusesProjectOutsideTheWorkspace() {
        // The caller's workspace contains only PROJ-1; they request a foreign project's distribution.
        when(projects.findByWorkspaceId(WS)).thenReturn(List.of(project()));

        KpiService.Distribution dist = kpi.distribution(WS, "PROJECT", "PROJ-FOREIGN");

        // No cross-tenant query is issued, and nothing is leaked.
        verify(workItems, never()).findByProjectId("PROJ-FOREIGN");
        assertThat(dist.outliers()).isEmpty();
        assertThat(dist.median()).isZero();
    }

    @Test
    void distribution_projectScope_allowsProjectInTheWorkspace() {
        when(projects.findByWorkspaceId(WS)).thenReturn(List.of(project()));
        when(workItems.findByProjectId("PROJ-1")).thenReturn(List.of(
            item("A-1", ME, "Done", 3, "Story"), item("A-2", OTHER, "Done", 2, "Bug")));

        kpi.distribution(WS, "PROJECT", "PROJ-1");

        // The in-workspace project is queried normally.
        verify(workItems).findByProjectId("PROJ-1");
    }
}
