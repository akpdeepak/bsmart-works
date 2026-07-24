package com.bcits.works.ai;
import com.bcits.works.ai.api.AiModelTier;
import com.bcits.works.ai.api.AiControlPlaneService;

import com.bcits.works.AiCapabilities;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Behaviour of the multi-step AI agent (Cap O, iteration 20): the deterministic planner maps goal
 * intent to ordered capability steps, and a run executes every step through the control plane and
 * persists an audited {@link AiAgentRun}. Pure unit tests with mocked collaborators (RB-10 §7).
 */
@Tag("unit")
class AiAgentServiceTest {

    private final AiAgentRunRepository runs = mock(AiAgentRunRepository.class);
    private final AiAgentStepRepository steps = mock(AiAgentStepRepository.class);
    private final AiControlPlaneService controlPlane = mock(AiControlPlaneService.class);
    private final EventService events = mock(EventService.class);

    private final AiAgentService service = new AiAgentService(runs, steps, controlPlane, events);

    private static final String WS = "WS-001";
    private static final String USER = "USR-001";

    private void aiOff() {
        when(controlPlane.invoke(any())).thenAnswer(inv -> {
            AiControlPlaneService.AiCall c = inv.getArgument(0);
            // Fallback echoes the deterministic draft, like the offline provider would.
            return new AiControlPlaneService.AiOutcome(false, true, c.draft(), AiModelTier.NONE,
                "DISABLED_WORKSPACE", 0, false);
        });
    }

    @Test
    void plan_decomposesTheTriageGoalIntoOrderedCapabilitySteps() {
        List<AiAgentService.PlannedStep> plan = AiAgentService.plan(
            "Triage all P0 customer requests from last 24 hours: categorize, suggest assignees, draft responses");
        // categorize → triage, suggest assignees → routing, draft responses → generation.
        assertThat(plan).extracting(AiAgentService.PlannedStep::capability)
            .containsExactly(AiCapabilities.TRIAGE, AiCapabilities.ROUTING, AiCapabilities.GENERATION);
    }

    @Test
    void plan_unknownGoalStillYieldsOneStep() {
        assertThat(AiAgentService.plan("do something vague")).hasSize(1);
        assertThat(AiAgentService.plan("")).hasSize(1);
    }

    @Test
    void run_executesEveryStepThroughTheControlPlaneAndPersistsAnAuditedRun() {
        aiOff();
        when(runs.save(any())).thenAnswer(i -> i.getArgument(0));
        when(steps.save(any())).thenAnswer(i -> i.getArgument(0));

        AiAgentService.RunView view = service.run(WS, USER, "Triage and draft responses");

        assertThat(view.run().getStatus()).isEqualTo("COMPLETED");
        assertThat(view.run().getWorkspaceId()).isEqualTo(WS);
        assertThat(view.steps()).isNotEmpty();
        assertThat(view.run().getStepCount()).isEqualTo(view.steps().size());
        assertThat(view.steps()).allSatisfy(s -> assertThat(s.getWorkspaceId()).isEqualTo(WS));
    }

    @Test
    void run_rejectsBlankGoal() {
        assertThatThrownBy(() -> service.run(WS, USER, "  ")).isInstanceOf(ApiException.class);
    }

    @Test
    void getRun_foreignWorkspaceRunIsNotFound() {
        when(runs.findByWorkspaceIdAndId(eq("WS-002"), anyString())).thenReturn(java.util.Optional.empty());
        assertThatThrownBy(() -> service.getRun("WS-002", "AGR-x")).isInstanceOf(ApiException.class);
    }
}
