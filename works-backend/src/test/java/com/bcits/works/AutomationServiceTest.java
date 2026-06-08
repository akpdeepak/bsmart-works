package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
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

    private final AutomationService svc = new AutomationService(rules, runs, workItems, projects,
        comments, events, webhooks, controlPlane);

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

        WorkItem triggering = item("INC-1", "Critical", "Incident", "Todo");
        int fired = svc.evaluateForItem(WS, "ITEM_CREATED", triggering, ACTOR);

        assertThat(fired).isEqualTo(1);
        assertThat(triggering.getStatus()).isEqualTo("In Progress");
        verify(workItems).save(triggering);
        verify(runs).save(any(AutomationRun.class));
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
}
