package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.EventService;
import com.bcits.works.workitems.StatusConfigService;
import com.bcits.works.workitems.WorkItemRepository;
import com.bcits.works.workitems.WorkflowStatus;
import com.bcits.works.projects.Sprint;
import com.bcits.works.projects.SprintController;
import com.bcits.works.projects.SprintDao;
import com.bcits.works.projects.SprintRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * B05: Sprint report tests — burndown signal, velocity calculation, and workspace isolation
 * for both the report and velocity endpoints (RB-40 §1, RB-05 Stage 3).
 *
 * <p>Uses the pure unit-test pattern (mocked repos + {@link SprintDao}, no DB) consistent with
 * {@link SprintControllerAccessTest} and {@link KpiServiceTest}.
 */
@Tag("unit")
class SprintReportTest {

    private static final String SPRINT_A = "SPR-A";
    private static final String SPRINT_B = "SPR-B";   // belongs to a different project/workspace
    private static final String PROJECT_A = "PROJ-A";
    private static final String PROJECT_B = "PROJ-B";
    private static final String CALLER = "user-1";

    private final SprintRepository sprintRepository = mock(SprintRepository.class);
    private final WorkItemRepository workItemRepository = mock(WorkItemRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final SprintDao sprintDao = mock(SprintDao.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final StatusConfigService statusConfig = mock(StatusConfigService.class);
    private final com.bcits.works.projects.ProjectService projectService =
            mock(com.bcits.works.projects.ProjectService.class);

    private final SprintController controller = new SprintController(
            sprintRepository, workItemRepository, eventService, sprintDao, authenticatedUser, rbac, statusConfig,
            projectService);

    private Sprint sprintA;
    private Sprint sprintB;

    @BeforeEach
    void setup() {
        sprintA = new Sprint();
        sprintA.setId(SPRINT_A);
        sprintA.setProjectId(PROJECT_A);
        sprintA.setName("Sprint 1");
        sprintA.setStatus("COMPLETED");
        sprintA.setCapacity(20);

        sprintB = new Sprint();
        sprintB.setId(SPRINT_B);
        sprintB.setProjectId(PROJECT_B);
        sprintB.setName("Sprint B-1");
        sprintB.setStatus("COMPLETED");
        sprintB.setCapacity(15);

        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForProject(PROJECT_A)).thenReturn("WS-A");
        when(rbac.getUserTier(CALLER, "WS-A")).thenReturn(2);
        when(rbac.workspaceForProject(PROJECT_B)).thenReturn("WS-B");
        when(rbac.getUserTier(CALLER, "WS-B")).thenReturn(2);
    }

    // ── helper: create a report item row (no null values — Map.of rejects nulls) ──

    private static Map<String, Object> itemRow(String id, String title, String status,
                                                String type, int points, String assigneeId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("title", title);
        m.put("status", status);
        m.put("type", type);
        m.put("story_points", points);
        m.put("assignee_id", assigneeId != null ? assigneeId : "");
        return m;
    }

    private static Map<String, Object> velocityRow(String status, int points) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", status);
        m.put("story_points", points);
        return m;
    }

    // ── Sprint report: burndown / completion rate ──────────────────────────────────

    /**
     * The sprint report aggregates done/in-progress/todo item counts and story-point totals.
     * Completing more items must mean doneItems and donePoints increase.
     */
    @Test
    void sprintReport_completionRate_reflectsDoneItems() {
        when(sprintRepository.findById(SPRINT_A)).thenReturn(Optional.of(sprintA));
        // 4 items: 2 done (5+3=8 pts), 1 in-progress (3 pts), 1 todo (5 pts) = 16 pts total
        List<Map<String, Object>> items = List.of(
            itemRow("WI-1", "T1", "Done",        "Story", 5, "u1"),
            itemRow("WI-2", "T2", "Done",        "Story", 3, "u1"),
            itemRow("WI-3", "T3", "In Progress", "Bug",   3, "u2"),
            itemRow("WI-4", "T4", "Todo",        "Story", 5, null)
        );
        when(sprintDao.reportItems(eq(SPRINT_A))).thenReturn(items);

        Map<String, Object> report = controller.getSprintReport(SPRINT_A);

        assertThat(report.get("totalItems")).isEqualTo(4);
        assertThat(report.get("doneItems")).isEqualTo(2L);
        assertThat(report.get("inProgressItems")).isEqualTo(1L);
        assertThat(report.get("todoItems")).isEqualTo(1L);
        assertThat(report.get("donePoints")).isEqualTo(8L);
        assertThat(report.get("totalPoints")).isEqualTo(16);
        // completionRate = round(2/4 * 100) = 50
        assertThat(((Number) report.get("completionRate")).longValue()).isEqualTo(50L);
    }

    @Test
    void sprintReport_allDone_yields100PercentCompletionRate() {
        when(sprintRepository.findById(SPRINT_A)).thenReturn(Optional.of(sprintA));
        List<Map<String, Object>> items = List.of(
            itemRow("WI-1", "T1", "Done", "Story", 5, "u1"),
            itemRow("WI-2", "T2", "Done", "Story", 8, "u2")
        );
        when(sprintDao.reportItems(eq(SPRINT_A))).thenReturn(items);

        Map<String, Object> report = controller.getSprintReport(SPRINT_A);

        assertThat(((Number) report.get("completionRate")).longValue()).isEqualTo(100L);
        assertThat(report.get("doneItems")).isEqualTo(2L);
    }

    /**
     * A workspace that renamed its done status (e.g. "Shipped", category DONE) must still have those
     * items counted as done — the report resolves the status's configured category, not a literal
     * "Done" string (RB-20 §4). Previously these were under-counted.
     */
    @Test
    void sprintReport_countsCustomConfiguredDoneStatus() {
        when(sprintRepository.findById(SPRINT_A)).thenReturn(Optional.of(sprintA));
        WorkflowStatus shipped = new WorkflowStatus();
        shipped.setName("Shipped");
        shipped.setCategory("DONE");
        when(statusConfig.statusesForType("WS-A", "Story")).thenReturn(List.of(shipped));
        // 2 "Shipped" (5+3=8 pts, both DONE by config) + 1 Todo (2 pts).
        // Mixed casing pins the shared resolver's case-insensitive config lookup.
        List<Map<String, Object>> items = List.of(
            itemRow("WI-1", "T1", "Shipped", "Story", 5, "u1"),
            itemRow("WI-2", "T2", "shipped", "Story", 3, "u1"),
            itemRow("WI-3", "T3", "Todo",    "Story", 2, null)
        );
        when(sprintDao.reportItems(eq(SPRINT_A))).thenReturn(items);

        Map<String, Object> report = controller.getSprintReport(SPRINT_A);

        assertThat(report.get("doneItems")).isEqualTo(2L);
        assertThat(report.get("donePoints")).isEqualTo(8L);
        assertThat(report.get("todoItems")).isEqualTo(1L);
        // round(2/3 * 100) = 67
        assertThat(((Number) report.get("completionRate")).longValue()).isEqualTo(67L);
    }

    @Test
    void sprintReport_noItems_yields0Rates() {
        when(sprintRepository.findById(SPRINT_A)).thenReturn(Optional.of(sprintA));
        when(sprintDao.reportItems(eq(SPRINT_A))).thenReturn(List.of());

        Map<String, Object> report = controller.getSprintReport(SPRINT_A);

        assertThat(((Number) report.get("completionRate")).longValue()).isEqualTo(0L);
        assertThat(((Number) report.get("velocityRate")).longValue()).isEqualTo(0L);
        assertThat(report.get("totalItems")).isEqualTo(0);
    }

    @Test
    void sprintReport_unknownSprintIdThrows() {
        when(sprintRepository.findById("SPR-MISSING")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> controller.getSprintReport("SPR-MISSING"))
                .isInstanceOf(Exception.class);
    }

    // ── Velocity chart: story points per sprint ────────────────────────────────────

    /**
     * The velocity chart returns one entry per sprint. donePoints must reflect only "Done" items.
     * The velocity chart uses findAllScopedToUser (workspace-scoped, RB-40 §1).
     */
    @Test
    void velocityChart_donePointsCountOnlyDoneItems() {
        when(sprintRepository.findAllScopedToUser(CALLER)).thenReturn(List.of(sprintA));
        // 2 done (6+4=10 pts), 1 in-progress (5 pts — must NOT count in donePoints)
        when(sprintDao.velocityItems(eq(SPRINT_A))).thenReturn(List.of(
            velocityRow("Done",        6),
            velocityRow("Done",        4),
            velocityRow("In Progress", 5)
        ));

        List<Map<String, Object>> chart = controller.getVelocityChart();

        assertThat(chart).hasSize(1);
        Map<String, Object> entry = chart.get(0);
        assertThat(entry.get("sprintId")).isEqualTo(SPRINT_A);
        assertThat(((Number) entry.get("donePoints")).intValue()).isEqualTo(10);
        assertThat(((Number) entry.get("totalPoints")).intValue()).isEqualTo(15); // 6+4+5
        assertThat(((Number) entry.get("doneItems")).longValue()).isEqualTo(2L);
        assertThat(((Number) entry.get("totalItems")).intValue()).isEqualTo(3);
    }

    @Test
    void velocityChart_multiSprint_eachSprintComputedIndependently() {
        when(sprintRepository.findAllScopedToUser(CALLER)).thenReturn(List.of(sprintA, sprintB));
        when(sprintDao.velocityItems(eq(SPRINT_A))).thenReturn(List.of(
            velocityRow("Done", 8)
        ));
        when(sprintDao.velocityItems(eq(SPRINT_B))).thenReturn(List.of(
            velocityRow("Done", 12),
            velocityRow("Done",  3)
        ));

        List<Map<String, Object>> chart = controller.getVelocityChart();

        assertThat(chart).hasSize(2);
        Map<String, Object> entryA = chart.stream()
            .filter(e -> SPRINT_A.equals(e.get("sprintId"))).findFirst().orElseThrow();
        Map<String, Object> entryB = chart.stream()
            .filter(e -> SPRINT_B.equals(e.get("sprintId"))).findFirst().orElseThrow();
        assertThat(((Number) entryA.get("donePoints")).intValue()).isEqualTo(8);
        assertThat(((Number) entryB.get("donePoints")).intValue()).isEqualTo(15);
    }

    // ── Workspace isolation: velocity uses findAllScopedToUser ─────────────────────

    /**
     * The velocity chart calls findAllScopedToUser (not findAll) so results are confined to
     * the caller's workspaces. This test verifies the correct scoped method is called with the
     * caller's user id, and that each sprint only counts its own work items.
     */
    @Test
    void velocityChart_usesWorkspaceScopedQuery_andEachSprintCountsOnlyItsOwnItems() {
        // Caller only belongs to workspace A — findAllScopedToUser returns only sprintA
        when(sprintRepository.findAllScopedToUser(CALLER)).thenReturn(List.of(sprintA));
        when(sprintDao.velocityItems(eq(SPRINT_A))).thenReturn(List.of(
            velocityRow("Done", 10)
        ));

        List<Map<String, Object>> chart = controller.getVelocityChart();

        // Only sprint A is visible — sprint B (different workspace) is not in the result
        assertThat(chart).hasSize(1);
        assertThat(chart.get(0).get("sprintId")).isEqualTo(SPRINT_A);
        assertThat(((Number) chart.get(0).get("donePoints")).intValue()).isEqualTo(10);
        // Confirm the scoped query was invoked with the caller's id
        verify(sprintRepository).findAllScopedToUser(CALLER);
        verify(sprintRepository, never()).findAll();
    }

    /**
     * Each sprint's story points are fetched by its own sprint_id. This ensures a sprint from
     * workspace B cannot "steal" points from workspace A's sprint_id query.
     */
    @Test
    void velocityChart_eachSprintOnlyQueriesItsOwnSprintId() {
        when(sprintRepository.findAllScopedToUser(CALLER)).thenReturn(List.of(sprintA, sprintB));
        // Sprint A has data; sprint B returns nothing (cross-workspace isolation)
        when(sprintDao.velocityItems(eq(SPRINT_A))).thenReturn(List.of(
            velocityRow("Done", 10)
        ));
        when(sprintDao.velocityItems(eq(SPRINT_B))).thenReturn(List.of());

        List<Map<String, Object>> chart = controller.getVelocityChart();

        // Sprint B must not inherit sprint A's points
        Map<String, Object> entryB = chart.stream()
            .filter(e -> SPRINT_B.equals(e.get("sprintId"))).findFirst().orElseThrow();
        assertThat(((Number) entryB.get("donePoints")).intValue()).isEqualTo(0);
        assertThat(((Number) entryB.get("totalPoints")).intValue()).isEqualTo(0);

        Map<String, Object> entryA = chart.stream()
            .filter(e -> SPRINT_A.equals(e.get("sprintId"))).findFirst().orElseThrow();
        assertThat(((Number) entryA.get("donePoints")).intValue()).isEqualTo(10);
    }
}
