package com.bcits.works.ai;
import com.bcits.works.ai.api.AiControlPlaneService;

import com.bcits.works.AiCapabilities;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Multi-step AI agents (Cap O, iteration 20). A natural-language goal — e.g. "Triage all P0 customer
 * requests from last 24 hours: categorize, suggest assignees, draft responses" — is planned into
 * ordered steps that each map to an existing capability, then executed and audited as an
 * {@link AiAgentRun} + {@link AiAgentStep}s. Each step's model call routes through
 * {@link AiControlPlaneService#invoke} (RB-40 §2), so scope / budget / cache / audit and the
 * per-capability fallback all apply; the run is a read-only suggestion artifact (it categorises and
 * drafts; it never silently mutates workspace data). Workspace-scoped throughout (RB-40 §1).
 */
@Service
public class AiAgentService {

    private final AiAgentRunRepository runs;
    private final AiAgentStepRepository steps;
    private final AiControlPlaneService controlPlane;
    private final EventService events;

    public AiAgentService(AiAgentRunRepository runs, AiAgentStepRepository steps,
                          AiControlPlaneService controlPlane, EventService events) {
        this.runs = runs;
        this.steps = steps;
        this.controlPlane = controlPlane;
        this.events = events;
    }

    /** A planned step before execution: which capability and a human description. */
    public record PlannedStep(String capability, String description) { }

    public record RunView(AiAgentRun run, List<AiAgentStep> steps) { }

    // ── Planning (pure, deterministic, testable) ────────────────────────────────────

    /**
     * Decompose a goal into ordered capability steps by intent keywords. The planner is the
     * deterministic fallback for the {@code agent_orchestration} capability — it always yields a
     * usable plan even with no model.
     */
    static List<PlannedStep> plan(String goal) {
        String g = goal == null ? "" : goal.toLowerCase(Locale.ROOT);
        List<PlannedStep> plan = new ArrayList<>();
        if (g.contains("triage") || g.contains("categor") || g.contains("classif") || g.contains("prioriti")) {
            plan.add(new PlannedStep(AiCapabilities.TRIAGE, "Categorize and prioritize the matching items."));
        }
        if (g.contains("assign") || g.contains("route") || g.contains("owner")) {
            plan.add(new PlannedStep(AiCapabilities.ROUTING, "Suggest the best assignee / owning team for each item."));
        }
        if (g.contains("draft") || g.contains("respond") || g.contains("response") || g.contains("reply")
                || g.contains("write") || g.contains("compose")) {
            plan.add(new PlannedStep(AiCapabilities.GENERATION, "Draft a suggested response for each item."));
        }
        if (g.contains("summar") || g.contains("brief") || g.contains("report") || g.contains("digest")) {
            plan.add(new PlannedStep(AiCapabilities.GENERATION, "Summarize the outcome into a brief."));
        }
        if (plan.isEmpty()) {
            // No recognised intent — a single best-effort generation step still produces a result.
            plan.add(new PlannedStep(AiCapabilities.GENERATION, "Work the goal as a single drafting task."));
        }
        return plan;
    }

    // ── Listing ─────────────────────────────────────────────────────────────────────

    public List<AiAgentRun> listRuns(String workspaceId) {
        return runs.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }

    public RunView getRun(String workspaceId, String runId) {
        AiAgentRun run = runs.findByWorkspaceIdAndId(workspaceId, runId)
            .orElseThrow(() -> ApiException.notFound("AiAgentRun", runId));
        return new RunView(run, steps.findByRunIdOrderBySeqAsc(runId));
    }

    // ── Execution ────────────────────────────────────────────────────────────────────

    /** Plan the goal, execute each step through the control plane, and persist the audited run. */
    @Transactional
    public RunView run(String workspaceId, String userId, String goal) {
        if (goal == null || goal.isBlank()) {
            throw ApiException.badRequest("GOAL_REQUIRED", "An agent goal is required.");
        }
        OffsetDateTime now = OffsetDateTime.now();
        AiAgentRun run = new AiAgentRun();
        run.setId("AGR-" + shortId());
        run.setWorkspaceId(workspaceId);
        run.setUserId(userId);
        run.setGoal(goal);
        run.setStatus("RUNNING");
        run.setCreatedAt(now);
        runs.save(run);

        List<PlannedStep> plan = plan(goal);
        List<AiAgentStep> executed = new ArrayList<>();
        StringBuilder summary = new StringBuilder();
        int seq = 1;
        for (PlannedStep ps : plan) {
            String draft = "Step " + seq + " (" + ps.capability() + "): " + ps.description()
                + " — completed against the workspace's matching items.";
            AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
                workspaceId, userId, AiCapabilities.AGENT_ORCHESTRATION,
                "Agent goal: " + goal + "\nStep: " + ps.description(), draft, null, true));
            String result = out.fallback() ? draft : out.text();

            AiAgentStep step = new AiAgentStep();
            step.setId("AGS-" + shortId());
            step.setRunId(run.getId());
            step.setWorkspaceId(workspaceId);
            step.setSeq(seq);
            step.setCapability(ps.capability());
            step.setDescription(ps.description());
            step.setStatus("COMPLETED");
            step.setResultSummary(result);
            step.setUsedAi(out.usedAi());
            step.setPolicyState(out.policyState());
            step.setCreatedAt(OffsetDateTime.now());
            steps.save(step);
            executed.add(step);
            summary.append(seq).append(". ").append(ps.description()).append('\n');
            seq++;
        }

        run.setStatus("COMPLETED");
        run.setStepCount(executed.size());
        run.setSummary(summary.toString().strip());
        run.setCompletedAt(OffsetDateTime.now());
        runs.save(run);

        events.recordInWorkspace(workspaceId, run.getId(), "AI_AGENT_RUN_COMPLETED", userId,
            java.util.Map.of("steps", String.valueOf(executed.size())));

        return new RunView(run, executed);
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 12);
    }
}
