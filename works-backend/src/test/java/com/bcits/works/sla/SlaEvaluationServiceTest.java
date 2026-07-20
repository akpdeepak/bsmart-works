package com.bcits.works.sla;

import com.bcits.works.shared.BqlCompiler;
import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Characterization coverage for the SLA engine's I/O orchestration: clock start conditions, the
 * MET/BREACHED/PAUSED/RESUMED transitions, escalation firing (threshold + on-breach, at most once
 * per step), the defensive skip of a malformed policy, and the workspace-scoped scope query
 * (RB-40 §1 — the workspaceId is always the first bind parameter).
 */
@Tag("unit")
class SlaEvaluationServiceTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BqlCompiler compiler = mock(BqlCompiler.class);
    private final SlaPolicyRepository policies = mock(SlaPolicyRepository.class);
    private final SlaTargetRepository targets = mock(SlaTargetRepository.class);
    private final SlaInstanceRepository instances = mock(SlaInstanceRepository.class);
    private final SlaEscalationRepository escalations = mock(SlaEscalationRepository.class);
    private final SlaCalendarRepository calendars = mock(SlaCalendarRepository.class);
    private final SlaCalculationService calc = mock(SlaCalculationService.class);
    private final SlaNotificationService notifier = mock(SlaNotificationService.class);
    private final EventService eventService = mock(EventService.class);

    private final SlaEvaluationService service = new SlaEvaluationService(
        jdbc, compiler, policies, targets, instances, escalations, calendars, calc, notifier, eventService);

    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-07-20T10:00:00Z");

    @BeforeEach
    void stubScopeCompilation() {
        when(compiler.compile(anyString(), anyString())).thenReturn(new BqlCompiler.Compiled("", List.of()));
    }

    // ── Fixtures ────────────────────────────────────────────────────────────────

    private static SlaPolicy policy() {
        SlaPolicy p = new SlaPolicy();
        p.setId("SLA-1");
        p.setWorkspaceId("WS-1");
        p.setActive(true);
        p.setScopeBql("");
        p.setCreatedBy("user-1");
        return p;
    }

    private static SlaTarget target(String startStatus, String stopStatus) {
        SlaTarget t = new SlaTarget();
        t.setId("TGT-1");
        t.setPolicyId("SLA-1");
        t.setMetric("RESOLUTION_TIME");
        t.setTargetMinutes(480);
        t.setStartStatus(startStatus);
        t.setStopStatus(stopStatus);
        return t;
    }

    private static SlaEvaluationService.ScopedItem item(String status) {
        return new SlaEvaluationService.ScopedItem("WI-1", "Fix outage", status, "PRJ-1", "dev-1", "user-1");
    }

    private static SlaInstance runningInstance() {
        SlaInstance i = new SlaInstance();
        i.setId("SLI-1");
        i.setWorkspaceId("WS-1");
        i.setWorkItemId("WI-1");
        i.setTargetId("TGT-1");
        i.setMetric("RESOLUTION_TIME");
        i.setState("RUNNING");
        i.setTargetMinutes(480);
        i.setElapsedMinutes(60);
        i.setLastResumedAt(NOW.minusHours(1));
        return i;
    }

    private static SlaCalculationService.ClockState state(String s, int elapsed, boolean met,
                                                          boolean breached, boolean paused, boolean resumed) {
        return new SlaCalculationService.ClockState(s, elapsed, met, breached, paused, resumed);
    }

    private void scopeReturns(List<SlaEvaluationService.ScopedItem> items) {
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenReturn(items);
    }

    // ── evaluatePolicy: gating and defensive paths ───────────────────────────────

    @Test
    void evaluatePolicy_inactivePolicyIsANoOp() {
        SlaPolicy inactive = policy();
        inactive.setActive(false);

        SlaEvaluationService.EvaluationResult r = service.evaluatePolicy(inactive);

        assertThat(r).isEqualTo(new SlaEvaluationService.EvaluationResult(0, 0, 0));
        verifyNoInteractions(jdbc, instances, eventService);
    }

    @Test
    void evaluatePolicy_nullActiveFlagIsANoOp() {
        SlaPolicy p = policy();
        p.setActive(null);

        assertThat(service.evaluatePolicy(p))
            .isEqualTo(new SlaEvaluationService.EvaluationResult(0, 0, 0));
    }

    @Test
    void evaluatePolicy_brokenScopeQueryIsSkippedNeverThrown() {
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .thenThrow(new RuntimeException("bad BQL"));

        SlaEvaluationService.EvaluationResult r = service.evaluatePolicy(policy());

        assertThat(r).isEqualTo(new SlaEvaluationService.EvaluationResult(0, 0, 0));
        verifyNoInteractions(instances, eventService);
    }

    // ── evaluatePolicy: starting clocks ─────────────────────────────────────────

    @Test
    void evaluatePolicy_startsARunningClockForANewInScopeItem() {
        scopeReturns(List.of(item("Open")));
        when(targets.findByPolicyIdOrderBySortOrderAsc("SLA-1")).thenReturn(List.of(target(null, "Done")));
        when(instances.findByWorkItemIdAndTargetId("WI-1", "TGT-1")).thenReturn(Optional.empty());
        OffsetDateTime due = OffsetDateTime.parse("2026-07-21T10:00:00Z");
        when(calc.addBusinessMinutes(any(), eq(480L), isNull())).thenReturn(due);

        SlaEvaluationService.EvaluationResult r = service.evaluatePolicy(policy());

        assertThat(r.scoped()).isEqualTo(1);
        assertThat(r.started()).isEqualTo(1);
        assertThat(r.advanced()).isZero();

        ArgumentCaptor<SlaInstance> saved = ArgumentCaptor.forClass(SlaInstance.class);
        verify(instances).save(saved.capture());
        SlaInstance i = saved.getValue();
        assertThat(i.getId()).startsWith("SLI-");
        assertThat(i.getWorkspaceId()).isEqualTo("WS-1");
        assertThat(i.getWorkItemId()).isEqualTo("WI-1");
        assertThat(i.getState()).isEqualTo("RUNNING");
        assertThat(i.getTargetMinutes()).isEqualTo(480);
        assertThat(i.getElapsedMinutes()).isZero();
        assertThat(i.getDueAt()).isEqualTo(due);
        verify(eventService).record(eq(i.getId()), eq("SLA_STARTED"), eq("system"), any(Map.class));
    }

    @Test
    void evaluatePolicy_itemAlreadyAtStopStatusNeverStartsAClock() {
        scopeReturns(List.of(item("Done")));
        when(targets.findByPolicyIdOrderBySortOrderAsc("SLA-1")).thenReturn(List.of(target(null, "Done")));
        when(instances.findByWorkItemIdAndTargetId("WI-1", "TGT-1")).thenReturn(Optional.empty());

        SlaEvaluationService.EvaluationResult r = service.evaluatePolicy(policy());

        assertThat(r.started()).isZero();
        verify(instances, never()).save(any());
    }

    @Test
    void evaluatePolicy_startStatusGateWaitsForTheTriggerStatus() {
        scopeReturns(List.of(item("Open")));
        when(targets.findByPolicyIdOrderBySortOrderAsc("SLA-1"))
            .thenReturn(List.of(target("In Progress", "Done")));
        when(instances.findByWorkItemIdAndTargetId("WI-1", "TGT-1")).thenReturn(Optional.empty());

        assertThat(service.evaluatePolicy(policy()).started()).isZero();
        verify(instances, never()).save(any());
    }

    // ── advance: transitions ────────────────────────────────────────────────────

    private SlaEvaluationService.EvaluationResult advanceWith(SlaInstance existing, String itemStatus,
                                                              SlaCalculationService.ClockState next,
                                                              List<SlaEscalation> steps) {
        scopeReturns(List.of(item(itemStatus)));
        when(targets.findByPolicyIdOrderBySortOrderAsc("SLA-1")).thenReturn(List.of(target(null, "Done")));
        when(escalations.findByPolicyIdOrderBySortOrderAsc("SLA-1")).thenReturn(steps);
        when(instances.findByWorkItemIdAndTargetId("WI-1", "TGT-1")).thenReturn(Optional.of(existing));
        when(calc.advance(anyString(), anyInt(), any(), anyInt(), anyString(), any(Set.class),
            any(), isNull(), any())).thenReturn(next);
        return service.evaluatePolicy(policy());
    }

    @Test
    void advance_settlesToMetAndRecordsTheEvent() {
        SlaInstance i = runningInstance();

        SlaEvaluationService.EvaluationResult r =
            advanceWith(i, "Done", state("MET", 120, true, false, false, false), List.of());

        assertThat(r.advanced()).isEqualTo(1);
        assertThat(i.getState()).isEqualTo("MET");
        assertThat(i.getElapsedMinutes()).isEqualTo(120);
        assertThat(i.getCompletedAt()).isNotNull();
        verify(instances).save(i);
        verify(eventService).record(eq("SLI-1"), eq("SLA_MET"), eq("system"), any(Map.class));
    }

    @Test
    void advance_breachSettlesTheClockAndFiresOnBreachEscalations() {
        SlaInstance i = runningInstance();
        SlaEscalation onBreach = new SlaEscalation();
        onBreach.setId("ESC-1");
        onBreach.setOnBreach(true);

        SlaEvaluationService.EvaluationResult r =
            advanceWith(i, "Open", state("BREACHED", 500, false, true, false, false), List.of(onBreach));

        assertThat(r.advanced()).isEqualTo(1);
        assertThat(i.getState()).isEqualTo("BREACHED");
        assertThat(i.getBreachedAt()).isNotNull();
        assertThat(i.getCompletedAt()).isNull(); // item is not at the stop status yet
        assertThat(i.getEscalatedSteps()).contains("ESC-1"); // fired exactly this step
        verify(notifier).routeEscalation(eq(onBreach), eq(i), eq("Fix outage"));
        verify(eventService).record(eq("SLI-1"), eq("SLA_BREACHED"), eq("system"), any(Map.class));
        verify(eventService).record(eq("SLI-1"), eq("SLA_ESCALATED"), eq("system"), any(Map.class));
    }

    @Test
    void advance_breachAtStopStatusAlsoCompletesTheClock() {
        SlaInstance i = runningInstance();

        advanceWith(i, "Done", state("BREACHED", 500, false, true, false, false), List.of());

        assertThat(i.getState()).isEqualTo("BREACHED");
        assertThat(i.getCompletedAt()).isNotNull();
    }

    @Test
    void advance_pauseFreezesTheClock() {
        SlaInstance i = runningInstance();

        SlaEvaluationService.EvaluationResult r =
            advanceWith(i, "Blocked", state("PAUSED", 90, false, false, true, false), List.of());

        assertThat(r.advanced()).isEqualTo(1);
        assertThat(i.getState()).isEqualTo("PAUSED");
        assertThat(i.getElapsedMinutes()).isEqualTo(90);
        assertThat(i.getPausedAt()).isNotNull();
        assertThat(i.getLastResumedAt()).isNull();
        verify(eventService).record(eq("SLI-1"), eq("SLA_PAUSED"), eq("system"), any(Map.class));
    }

    @Test
    void advance_resumeRestartsTheClockAndRecomputesTheDeadlineFromRemainingBudget() {
        SlaInstance i = runningInstance();
        i.setState("PAUSED");
        i.setElapsedMinutes(100);
        i.setLastResumedAt(null);
        i.setPausedAt(NOW.minusHours(2));
        OffsetDateTime newDue = OffsetDateTime.parse("2026-07-22T09:00:00Z");
        // remaining = target 480 - banked 100 = 380
        when(calc.addBusinessMinutes(any(), eq(380L), isNull())).thenReturn(newDue);

        SlaEvaluationService.EvaluationResult r =
            advanceWith(i, "Open", state("RUNNING", 100, false, false, false, true), List.of());

        assertThat(r.advanced()).isEqualTo(1);
        assertThat(i.getState()).isEqualTo("RUNNING");
        assertThat(i.getPausedAt()).isNull();
        assertThat(i.getLastResumedAt()).isNotNull();
        assertThat(i.getDueAt()).isEqualTo(newDue);
        verify(eventService).record(eq("SLI-1"), eq("SLA_RESUMED"), eq("system"), any(Map.class));
    }

    @Test
    void advance_settledClockIsLeftAlone() {
        SlaInstance i = runningInstance();
        i.setState("MET");

        SlaEvaluationService.EvaluationResult r =
            advanceWith(i, "Done", state("MET", 120, false, false, false, false), List.of());

        assertThat(r.advanced()).isZero();
        verify(instances, never()).save(any());
    }

    // ── advance: threshold escalations ──────────────────────────────────────────

    @Test
    void advance_thresholdEscalationFiresOnLiveConsumptionAndOnlyOnce() {
        SlaInstance i = runningInstance();
        i.setEscalatedSteps("[\"ESC-OLD\"]");
        SlaEscalation at80 = new SlaEscalation();
        at80.setId("ESC-80");
        at80.setThresholdPercent(80);
        SlaEscalation alreadyFired = new SlaEscalation();
        alreadyFired.setId("ESC-OLD");
        alreadyFired.setThresholdPercent(50);
        SlaEscalation otherTarget = new SlaEscalation();
        otherTarget.setId("ESC-OTHER");
        otherTarget.setTargetId("TGT-999");
        otherTarget.setThresholdPercent(10);
        when(calc.businessMinutesBetween(any(), any(), isNull())).thenReturn(340L);
        when(calc.consumptionPercent(anyInt(), eq(480))).thenReturn(83);

        SlaEvaluationService.EvaluationResult r = advanceWith(i, "Open",
            state("RUNNING", 60, false, false, false, false), List.of(at80, alreadyFired, otherTarget));

        assertThat(r.advanced()).isEqualTo(1); // fired ⇒ counts as a change
        assertThat(i.getEscalatedSteps()).contains("ESC-80").contains("ESC-OLD").doesNotContain("ESC-OTHER");
        verify(notifier).routeEscalation(eq(at80), eq(i), anyString());
        verify(notifier, never()).routeEscalation(eq(alreadyFired), any(), anyString());
        verify(notifier, never()).routeEscalation(eq(otherTarget), any(), anyString());
        verify(instances).save(i);
    }

    @Test
    void advance_belowEveryThresholdNothingChanges() {
        SlaInstance i = runningInstance();
        SlaEscalation at80 = new SlaEscalation();
        at80.setId("ESC-80");
        at80.setThresholdPercent(80);
        when(calc.businessMinutesBetween(any(), any(), isNull())).thenReturn(10L);
        when(calc.consumptionPercent(anyInt(), eq(480))).thenReturn(14);

        SlaEvaluationService.EvaluationResult r = advanceWith(i, "Open",
            state("RUNNING", 60, false, false, false, false), List.of(at80));

        assertThat(r.advanced()).isZero();
        verify(instances, never()).save(any());
        verifyNoInteractions(notifier);
    }

    @Test
    void advance_malformedPauseStatusesJsonDegradesToNoPauses() {
        SlaInstance i = runningInstance();
        SlaTarget t = target(null, "Done");
        t.setPauseStatuses("{not json");
        scopeReturns(List.of(item("Open")));
        when(targets.findByPolicyIdOrderBySortOrderAsc("SLA-1")).thenReturn(List.of(t));
        when(escalations.findByPolicyIdOrderBySortOrderAsc("SLA-1")).thenReturn(List.of());
        when(instances.findByWorkItemIdAndTargetId("WI-1", "TGT-1")).thenReturn(Optional.of(i));
        ArgumentCaptor<Set<String>> pauses = ArgumentCaptor.forClass(Set.class);
        when(calc.advance(anyString(), anyInt(), any(), anyInt(), anyString(), pauses.capture(),
            any(), isNull(), any())).thenReturn(state("RUNNING", 60, false, false, false, false));

        service.evaluatePolicy(policy());

        assertThat(pauses.getValue()).isEmpty();
    }

    // ── sweep / applyNow / preview ──────────────────────────────────────────────

    @Test
    void sweep_advancesLiveClocksAcrossAllActivePolicies() {
        when(policies.findByActiveTrue()).thenReturn(List.of(policy()));
        SlaInstance i = runningInstance();
        scopeReturns(List.of(item("Done")));
        when(targets.findByPolicyIdOrderBySortOrderAsc("SLA-1")).thenReturn(List.of(target(null, "Done")));
        when(instances.findByWorkItemIdAndTargetId("WI-1", "TGT-1")).thenReturn(Optional.of(i));
        when(calc.advance(anyString(), anyInt(), any(), anyInt(), anyString(), any(Set.class),
            any(), isNull(), any())).thenReturn(state("MET", 120, true, false, false, false));

        assertThat(service.sweep()).isEqualTo(1);
    }

    @Test
    void applyNow_delegatesToEvaluatePolicy() {
        scopeReturns(List.of());
        when(targets.findByPolicyIdOrderBySortOrderAsc("SLA-1")).thenReturn(List.of());

        assertThat(service.applyNow(policy()))
            .isEqualTo(new SlaEvaluationService.EvaluationResult(0, 0, 0));
    }

    @Test
    void preview_reportsScopeSizeWithACappedSample() {
        List<SlaEvaluationService.ScopedItem> twelve = new java.util.ArrayList<>();
        for (int n = 0; n < 12; n++) {
            twelve.add(new SlaEvaluationService.ScopedItem("WI-" + n, n == 0 ? null : "Item " + n,
                "Open", "PRJ-1", null, null));
        }
        scopeReturns(twelve);

        Map<String, Object> out = service.preview(policy());

        assertThat(out.get("valid")).isEqualTo(true);
        assertThat(out.get("scoped")).isEqualTo(12);
        List<?> sample = (List<?>) out.get("sample");
        assertThat(sample).hasSize(10); // capped
        assertThat(((Map<?, ?>) sample.get(0)).get("title")).isEqualTo(""); // null title → ""
    }

    @Test
    void preview_invalidScopeReportsTheErrorInsteadOfThrowing() {
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .thenThrow(new RuntimeException("Unknown field: bogus"));

        Map<String, Object> out = service.preview(policy());

        assertThat(out.get("valid")).isEqualTo(false);
        assertThat(out.get("error")).isEqualTo("Unknown field: bogus");
    }

    // ── findScopedItems: workspace scoping and the row mapper ───────────────────

    @Test
    void findScopedItems_bindsTheWorkspaceFirstAndAppendsTheCompiledScope() {
        SlaPolicy p = policy();
        p.setScopeBql("priority = 'HIGH'");
        when(compiler.compile(eq("priority = 'HIGH'"), eq("user-1")))
            .thenReturn(new BqlCompiler.Compiled("priority = ?", List.of("HIGH")));
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> params = ArgumentCaptor.forClass(Object[].class);
        when(jdbc.query(sql.capture(), any(RowMapper.class), params.capture())).thenReturn(List.of());

        service.findScopedItems(p);

        assertThat(sql.getValue())
            .contains("project_id IN (SELECT id FROM projects WHERE workspace_id = ?)")
            .contains("AND (priority = ?)")
            .contains("LIMIT 1000");
        assertThat(params.getValue()).containsExactly("WS-1", "HIGH");
    }

    @Test
    void findScopedItems_defaultsTheCompileActorToSystemWhenThePolicyHasNoAuthor() {
        SlaPolicy p = policy();
        p.setCreatedBy(null);
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenReturn(List.of());

        service.findScopedItems(p);

        verify(compiler).compile("", "system");
    }

    @Test
    void findScopedItems_mapsTheRowIntoAScopedItem() throws Exception {
        ArgumentCaptor<RowMapper<SlaEvaluationService.ScopedItem>> mapper =
            ArgumentCaptor.forClass(RowMapper.class);
        when(jdbc.query(anyString(), mapper.capture(), any(Object[].class))).thenReturn(List.of());
        service.findScopedItems(policy());

        ResultSet rs = mock(ResultSet.class);
        when(rs.getString("id")).thenReturn("WI-9");
        when(rs.getString("title")).thenReturn("Title");
        when(rs.getString("status")).thenReturn("Open");
        when(rs.getString("project_id")).thenReturn("PRJ-9");
        when(rs.getString("assignee_id")).thenReturn("dev-9");
        when(rs.getString("created_by")).thenReturn("user-9");

        SlaEvaluationService.ScopedItem mapped = mapper.getValue().mapRow(rs, 0);

        assertThat(mapped).isEqualTo(new SlaEvaluationService.ScopedItem(
            "WI-9", "Title", "Open", "PRJ-9", "dev-9", "user-9"));
    }
}
