package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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

    private final KpiService kpi = new KpiService(workItems, projects, teams, definitions,
        snapshots, shares, controlPlane);

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
        assertThatThrownBy(() -> kpi.share(WS, ME, ME)).isInstanceOf(ApiException.class);
    }

    // ── custom definition validation ────────────────────────────────────────────────

    @Test
    void createDefinition_rejectsIndividualScope() {
        MetricDefinition def = new MetricDefinition();
        def.setPrimitive("AVG");
        def.setScopeLevel("INDIVIDUAL");
        assertThatThrownBy(() -> kpi.createDefinition(WS, ME, def)).isInstanceOf(ApiException.class);
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

    // ── pure computation helpers ─────────────────────────────────────────────────────

    @Test
    void velocity_sumsDoneStoryPoints() {
        List<WorkItem> items = List.of(
            item("A", ME, "Done", 3, "Story"),
            item("B", ME, "Done", 5, "Story"),
            item("C", ME, "In Progress", 8, "Story"));
        assertThat(KpiService.velocity(items)).isEqualTo(8.0);
    }

    @Test
    void completionRate_isDoneOverTotalPercent() {
        List<WorkItem> items = List.of(
            item("A", ME, "Done", 1, "Story"),
            item("B", ME, "Todo", 1, "Story"),
            item("C", ME, "Done", 1, "Story"),
            item("D", ME, "Todo", 1, "Story"));
        assertThat(KpiService.completionRate(items)).isEqualTo(50.0);
    }

    @Test
    void wipAndBugEscape_count() {
        List<WorkItem> items = List.of(
            item("A", ME, "In Progress", 1, "Story"),
            item("B", ME, "In Review", 1, "Bug"),
            item("C", ME, "Done", 1, "Bug"),
            item("D", ME, "Todo", 1, "Story"));
        assertThat(KpiService.wipCount(items)).isEqualTo(2.0);
        assertThat(KpiService.bugEscapeRate(items)).isEqualTo(50.0);
    }

    @Test
    void band_classifiesHealth() {
        assertThat(KpiService.band(85)).isEqualTo("healthy");
        assertThat(KpiService.band(70)).isEqualTo("watch");
        assertThat(KpiService.band(40)).isEqualTo("risk");
    }

    @Test
    void bucketize_distributesByEdges() {
        List<Double> hours = List.of(10.0, 50.0, 100.0, 400.0);
        List<Integer> buckets = KpiService.bucketize(hours, new int[]{24, 72, 168, 336});
        assertThat(buckets).containsExactly(1, 1, 1, 0, 1);
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
