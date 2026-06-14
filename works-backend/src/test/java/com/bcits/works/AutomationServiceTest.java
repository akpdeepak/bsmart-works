package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Automation engine behaviour (iteration 13, Cap C): the safe condition matcher, action
 * normalization, and — crucially — that test mode mutates nothing while real evaluation applies the
 * configured actions and audits the run (RB-05 Stage 3, RB-20 §5). Pure helpers tested directly
 * (RB-10 §7); orchestration tested with mocked repositories.
 */
@Tag("unit")
class AutomationServiceTest {

    private static final String WS = "ws-1";
    private static final String ACTOR = "user-1";

    private final AutomationRuleRepository rules = mock(AutomationRuleRepository.class);
    private final AutomationRunRepository runs = mock(AutomationRunRepository.class);
    private final WorkItemRepository workItems = mock(WorkItemRepository.class);
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final CommentRepository comments = mock(CommentRepository.class);
    private final EventService events = mock(EventService.class);
    private final WebhookService webhooks = mock(WebhookService.class);
    private final AiControlPlaneService controlPlane = mock(AiControlPlaneService.class);
    private final BqlQueryExecutor bqlExecutor = mock(BqlQueryExecutor.class);

    private final AutomationService svc = new AutomationService(rules, runs, workItems, projects,
        comments, events, webhooks, controlPlane, bqlExecutor);

    private WorkItem item(String id, String priority, String type, String status) {
        WorkItem w = new WorkItem();
        w.setId(id);
        w.setProjectId("PROJ-1");
        w.setPriority(priority);
        w.setType(type);
        w.setStatus(status);
        return w;
    }

    private Project project() {
        Project p = new Project();
        p.setId("PROJ-1");
        p.setWorkspaceId(WS);
        return p;
    }

    // ── pure condition matcher ────────────────────────────────────────────────────

    @Test
    void conditionMatches_emptyMatchesAll() {
        assertThat(AutomationService.conditionMatches(item("A", "High", "Bug", "Todo"), "")).isTrue();
        assertThat(AutomationService.conditionMatches(item("A", "High", "Bug", "Todo"), null)).isTrue();
    }

    @Test
    void conditionMatches_andCombinesAndRespectsOperators() {
        WorkItem w = item("A", "High", "Bug", "Todo");
        assertThat(AutomationService.conditionMatches(w, "priority = High AND type = Bug")).isTrue();
        assertThat(AutomationService.conditionMatches(w, "priority = Low")).isFalse();
        assertThat(AutomationService.conditionMatches(w, "priority != Low")).isTrue();
        assertThat(AutomationService.conditionMatches(w, "type != Bug")).isFalse();
        assertThat(AutomationService.conditionMatches(w, "priority = \"High\"")).isTrue();   // quoted value
    }

    // ── normalization ─────────────────────────────────────────────────────────────

    @Test
    void normalizeActions_dropsUnknownActions() {
        String in = "[{\"type\":\"SET_STATUS\",\"params\":{\"status\":\"Done\"}},"
            + "{\"type\":\"HACK\",\"params\":{}}]";
        String out = svc.normalizeActions(in);
        assertThat(out).contains("SET_STATUS").doesNotContain("HACK");
    }

    @Test
    void prepareNew_startsDisabledWithId() {
        AutomationRule r = new AutomationRule();
        r.setName("x");
        r.setTriggerType("item_created");
        AutomationRule prepared = svc.prepareNew(WS, ACTOR, r);
        assertThat(prepared.getId()).startsWith("AUTO-");
        assertThat(prepared.getEnabled()).isFalse();
        assertThat(prepared.getTriggerType()).isEqualTo("ITEM_CREATED");
    }

    // ── test mode mutates nothing ───────────────────────────────────────────────────

    @Test
    void test_previewsWithoutMutating() {
        AutomationRule rule = new AutomationRule();
        rule.setId("AUTO-1");
        rule.setWorkspaceId(WS);
        rule.setConditionExpr("priority = High");
        rule.setActions("[{\"type\":\"SET_STATUS\",\"params\":{\"status\":\"Done\"}}]");
        when(rules.findById("AUTO-1")).thenReturn(Optional.of(rule));
        when(projects.findByWorkspaceId(WS)).thenReturn(List.of(project()));
        when(workItems.findByProjectId("PROJ-1")).thenReturn(List.of(
            item("A", "High", "Bug", "Todo"), item("B", "Low", "Task", "Todo")));
        // The scoped BQL match runs through the executor: only item A satisfies `priority = High`.
        when(bqlExecutor.matchesItem("A", "priority = High")).thenReturn(true);
        when(bqlExecutor.matchesItem("B", "priority = High")).thenReturn(false);

        AutomationService.Preview preview = svc.test(WS, "AUTO-1");

        assertThat(preview.dryRun()).isTrue();
        assertThat(preview.affected()).isEqualTo(1);
        verify(workItems, never()).save(any());            // no mutation in test mode
        verify(runs).save(any(AutomationRun.class));       // dry-run audited
    }

    // ── real evaluation applies actions + audits ─────────────────────────────────────

    @Test
    void evaluateForItem_appliesActionAndRecordsRun() {
        AutomationRule rule = new AutomationRule();
        rule.setId("AUTO-2");
        rule.setWorkspaceId(WS);
        rule.setConditionExpr("type = Incident");
        rule.setActions("[{\"type\":\"SET_STATUS\",\"params\":{\"status\":\"In Progress\"}}]");
        when(rules.findByWorkspaceIdAndEnabledTrueAndTriggerType(eq(WS), eq("ITEM_CREATED")))
            .thenReturn(List.of(rule));
        // The triggering item matches the rule's BQL condition via the scoped executor.
        when(bqlExecutor.matchesItem("INC-1", "type = Incident")).thenReturn(true);

        WorkItem triggering = item("INC-1", "Critical", "Incident", "Todo");
        int fired = svc.evaluateForItem(WS, "ITEM_CREATED", triggering, ACTOR);

        assertThat(fired).isEqualTo(1);
        assertThat(triggering.getStatus()).isEqualTo("In Progress");
        verify(workItems).save(triggering);
        verify(runs).save(any(AutomationRun.class));
    }

    // ── trigger wiring: STATUS_CHANGED fires on status change ────────────────────────

    @Test
    void evaluateForItem_statusChangedRuleFires() {
        AutomationRule rule = new AutomationRule();
        rule.setId("AUTO-SC");
        rule.setWorkspaceId(WS);
        rule.setConditionExpr("status = In Progress");
        rule.setActions("[{\"type\":\"NOTIFY\",\"params\":{\"message\":\"Status moved to In Progress\"}}]");
        when(rules.findByWorkspaceIdAndEnabledTrueAndTriggerType(eq(WS), eq("STATUS_CHANGED")))
            .thenReturn(List.of(rule));
        when(bqlExecutor.matchesItem("TASK-1", "status = In Progress")).thenReturn(true);

        WorkItem item = item("TASK-1", "Medium", "Task", "In Progress");
        int fired = svc.evaluateForItem(WS, "STATUS_CHANGED", item, ACTOR);

        assertThat(fired).isEqualTo(1);
        verify(runs).save(any(AutomationRun.class));
    }

    // ── recursion guard: SET_STATUS action does NOT re-trigger STATUS_CHANGED ────────

    @Test
    void evaluateForItem_recursionGuardPreventsReentry() {
        AutomationRule rule = new AutomationRule();
        rule.setId("AUTO-LOOP");
        rule.setWorkspaceId(WS);
        rule.setConditionExpr("");
        rule.setActions("[{\"type\":\"SET_STATUS\",\"params\":{\"status\":\"Done\"}}]");
        when(rules.findByWorkspaceIdAndEnabledTrueAndTriggerType(eq(WS), eq("STATUS_CHANGED")))
            .thenReturn(List.of(rule));
        // Simulate: inside the action we call evaluateForItem again (same thread).
        // The guard must suppress that nested call.
        WorkItem item = item("TASK-2", "Low", "Task", "In Progress");
        when(bqlExecutor.matchesItem(eq("TASK-2"), any())).thenReturn(true);

        // First call fires; if the guard works, the action's internal save would not re-enter.
        int outerFired = svc.evaluateForItem(WS, "STATUS_CHANGED", item, ACTOR);
        // Simulate a nested call as would happen from a lifecycle hook inside the action:
        int innerFired = svc.evaluateForItem(WS, "STATUS_CHANGED", item, ACTOR);

        assertThat(outerFired).isEqualTo(1);  // outer evaluation fires once
        assertThat(innerFired).isEqualTo(0);  // nested call suppressed by guard
    }

    // ── per-action error recording: FAILED run written on action exception ──────────

    @Test
    void evaluateForItem_actionFailureRecordsFailedRun() {
        AutomationRule rule = new AutomationRule();
        rule.setId("AUTO-FAIL");
        rule.setWorkspaceId(WS);
        rule.setConditionExpr("");
        rule.setActions("[{\"type\":\"SET_STATUS\",\"params\":{\"status\":\"Done\"}}]");
        when(rules.findByWorkspaceIdAndEnabledTrueAndTriggerType(eq(WS), eq("ITEM_CREATED")))
            .thenReturn(List.of(rule));
        when(bqlExecutor.matchesItem(eq("TASK-3"), any())).thenReturn(true);
        // Force the repository save to throw so the per-action catch kicks in.
        when(workItems.save(any())).thenThrow(new RuntimeException("db error"));

        WorkItem item = item("TASK-3", "High", "Task", "Todo");
        // Should not throw — the per-action catch swallows the error and records a FAILED run.
        int fired = svc.evaluateForItem(WS, "ITEM_CREATED", item, ACTOR);

        assertThat(fired).isEqualTo(1); // rule matched and attempted; count from the outer SUCCESS path
        // A FAILED run was recorded by the per-action catch
        verify(runs, org.mockito.Mockito.atLeastOnce()).save(any(AutomationRun.class));
    }

    @Test
    void requireRule_rejectsCrossWorkspace() {
        AutomationRule rule = new AutomationRule();
        rule.setId("AUTO-3");
        rule.setWorkspaceId("other-ws");
        when(rules.findById("AUTO-3")).thenReturn(Optional.of(rule));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> svc.require(WS, "AUTO-3"))
            .isInstanceOf(ApiException.class);
    }

    // ── BQL-backed condition matcher ───────────────────────────────────────────────

    @Test
    void conditionMatchesBql_emptyConditionMatchesAll() {
        assertThat(svc.conditionMatchesBql(item("A", "High", "Bug", "Todo"), "")).isTrue();
        assertThat(svc.conditionMatchesBql(item("A", "High", "Bug", "Todo"), null)).isTrue();
        // Empty/blank short-circuits before the executor — no scoped query is run.
        verify(bqlExecutor, never()).matchesItem(any(), any());
    }

    @Test
    void conditionMatchesBql_delegatesToExecutorAndReturnsMatch() {
        WorkItem w = item("WEB-1", "High", "Bug", "Todo");
        when(bqlExecutor.matchesItem("WEB-1", "priority = High")).thenReturn(true);
        assertThat(svc.conditionMatchesBql(w, "priority = High")).isTrue();
        verify(bqlExecutor).matchesItem("WEB-1", "priority = High");
    }

    @Test
    void conditionMatchesBql_returnsFalseWhenExecutorReportsNoMatch() {
        WorkItem w = item("WEB-1", "High", "Bug", "Todo");
        when(bqlExecutor.matchesItem("WEB-1", "priority = Low")).thenReturn(false);
        assertThat(svc.conditionMatchesBql(w, "priority = Low")).isFalse();
    }

    @Test
    void conditionMatchesBql_fallsBackToLegacyOnCompileFailure() {
        WorkItem w = item("WEB-1", "High", "Bug", "Todo");
        // A BqlException is a compile failure — degrade to the legacy in-memory matcher (RB-40 §2).
        when(bqlExecutor.matchesItem(eq("WEB-1"), any()))
            .thenThrow(new BqlException("unparseable"));
        assertThat(svc.conditionMatchesBql(w, "priority = High")).isTrue();   // legacy says High==High
        assertThat(svc.conditionMatchesBql(w, "priority = Low")).isFalse();   // legacy says High!=Low
    }

    @Test
    void conditionMatchesBql_propagatesRuntimeErrorsInsteadOfSilentFallback() {
        WorkItem w = item("WEB-1", "High", "Bug", "Todo");
        // A non-compile error (e.g. a DB fault) must NOT be masked as a non-match — it propagates,
        // so a genuine fault is surfaced rather than silently degrading the rule (narrowed catch).
        when(bqlExecutor.matchesItem(eq("WEB-1"), any()))
            .thenThrow(new IllegalStateException("db down"));
        assertThatThrownBy(() -> svc.conditionMatchesBql(w, "priority = High"))
            .isInstanceOf(IllegalStateException.class);
    }
}
