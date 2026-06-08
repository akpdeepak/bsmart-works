package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap Y · User lifecycle automation (iteration 16) — onboarding/offboarding playbooks and the runs
 * that execute them with a role-aware, audited step checklist. Admin-gated (RB-10 §2),
 * workspace-scoped (RB-40 §1).
 */
@Service
public class OnboardingPlaybookService {

    private final OnboardingPlaybookRepository playbooks;
    private final OnboardingPlaybookStepRepository steps;
    private final OnboardingRunRepository runs;
    private final OnboardingRunStepRepository runSteps;
    private final RbacService rbac;
    private final EventService events;

    public OnboardingPlaybookService(OnboardingPlaybookRepository playbooks,
                                     OnboardingPlaybookStepRepository steps,
                                     OnboardingRunRepository runs,
                                     OnboardingRunStepRepository runSteps,
                                     RbacService rbac, EventService events) {
        this.playbooks = playbooks;
        this.steps = steps;
        this.runs = runs;
        this.runSteps = runSteps;
        this.rbac = rbac;
        this.events = events;
    }

    private void requireAdmin(String callerId, String wsId) {
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Workspace", wsId);
        }
        if (!rbac.isAdmin(callerId, wsId)) {
            throw ApiException.forbidden("User lifecycle automation requires a workspace administrator.");
        }
    }

    // ── Playbooks ────────────────────────────────────────────────────────────────
    public List<Map<String, Object>> listPlaybooks(String callerId, String workspaceId) {
        requireAdmin(callerId, workspaceId);
        List<OnboardingPlaybook> all = playbooks.findByWorkspaceIdOrderByKindAscNameAsc(workspaceId);
        return all.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("playbook", p);
            m.put("steps", steps.findByPlaybookIdOrderBySortOrderAsc(p.getId()));
            return m;
        }).toList();
    }

    @Transactional
    public OnboardingPlaybook createPlaybook(String callerId, OnboardingPlaybook in) {
        requireAdmin(callerId, in.getWorkspaceId());
        in.setId("PB-" + shortId());
        in.setCreatedBy(callerId);
        OffsetDateTime now = OffsetDateTime.now();
        in.setCreatedAt(now);
        in.setUpdatedAt(now);
        return playbooks.save(in);
    }

    @Transactional
    public OnboardingPlaybookStep addStep(String callerId, String playbookId, OnboardingPlaybookStep step) {
        OnboardingPlaybook pb = playbooks.findById(playbookId)
            .orElseThrow(() -> ApiException.notFound("OnboardingPlaybook", playbookId));
        requireAdmin(callerId, pb.getWorkspaceId());
        step.setId("PBS-" + shortId());
        step.setPlaybookId(playbookId);
        step.setWorkspaceId(pb.getWorkspaceId());
        return steps.save(step);
    }

    // ── Runs ──────────────────────────────────────────────────────────────────────
    public List<OnboardingRun> listRuns(String callerId, String workspaceId) {
        requireAdmin(callerId, workspaceId);
        return runs.findByWorkspaceIdOrderByStartedAtDesc(workspaceId);
    }

    public Map<String, Object> getRun(String callerId, String runId) {
        OnboardingRun run = loadRun(callerId, runId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("run", run);
        out.put("steps", runSteps.findByRunIdOrderBySortOrderAsc(runId));
        return out;
    }

    /** Start a run: snapshot the playbook's steps into PENDING run-steps (an audit-stable checklist). */
    @Transactional
    public Map<String, Object> startRun(String callerId, String workspaceId, String playbookId,
                                        String subjectName, String subjectEmail) {
        requireAdmin(callerId, workspaceId);
        OnboardingPlaybook pb = playbooks.findById(playbookId)
            .orElseThrow(() -> ApiException.notFound("OnboardingPlaybook", playbookId));
        if (!workspaceId.equals(pb.getWorkspaceId())) {
            throw ApiException.notFound("OnboardingPlaybook", playbookId);
        }
        if (subjectName == null || subjectName.isBlank()) {
            throw ApiException.badRequest("VALIDATION", "Subject name is required.", "subjectName");
        }

        OnboardingRun run = new OnboardingRun();
        run.setId("RUN-" + shortId());
        run.setWorkspaceId(workspaceId);
        run.setPlaybookId(playbookId);
        run.setKind(pb.getKind());
        run.setSubjectName(subjectName.trim());
        run.setSubjectEmail(subjectEmail);
        run.setStatus("IN_PROGRESS");
        run.setStartedBy(callerId);
        OffsetDateTime now = OffsetDateTime.now();
        run.setStartedAt(now);
        run.setCreatedAt(now);
        run.setUpdatedAt(now);
        runs.save(run);

        for (OnboardingPlaybookStep s : steps.findByPlaybookIdOrderBySortOrderAsc(playbookId)) {
            OnboardingRunStep rs = new OnboardingRunStep();
            rs.setId("RST-" + shortId());
            rs.setRunId(run.getId());
            rs.setWorkspaceId(workspaceId);
            rs.setTitle(s.getTitle());
            rs.setActionType(s.getActionType());
            rs.setStatus("PENDING");
            rs.setSortOrder(s.getSortOrder());
            runSteps.save(rs);
        }
        events.recordInWorkspace(workspaceId, run.getId(),
            "OFFBOARD".equals(pb.getKind()) ? "OFFBOARDING_STARTED" : "ONBOARDING_STARTED", callerId,
            Map.of("subject", run.getSubjectName(), "playbook", pb.getName()));
        return getRun(callerId, run.getId());
    }

    @Transactional
    public Map<String, Object> completeStep(String callerId, String runId, String stepId, boolean skip, String note) {
        OnboardingRun run = loadRun(callerId, runId);
        OnboardingRunStep step = runSteps.findById(stepId)
            .orElseThrow(() -> ApiException.notFound("OnboardingRunStep", stepId));
        if (!run.getId().equals(step.getRunId())) {
            throw ApiException.notFound("OnboardingRunStep", stepId);
        }
        step.setStatus(skip ? "SKIPPED" : "DONE");
        step.setNote(note);
        step.setCompletedBy(callerId);
        step.setCompletedAt(OffsetDateTime.now());
        runSteps.save(step);

        // Auto-complete the run when no step is still pending.
        List<OnboardingRunStep> all = runSteps.findByRunIdOrderBySortOrderAsc(runId);
        boolean anyPending = all.stream().anyMatch(s -> "PENDING".equals(s.getStatus()));
        if (!anyPending && "IN_PROGRESS".equals(run.getStatus())) {
            run.setStatus("COMPLETED");
            run.setCompletedAt(OffsetDateTime.now());
            run.setUpdatedAt(OffsetDateTime.now());
            runs.save(run);
            events.recordInWorkspace(run.getWorkspaceId(), run.getId(),
                "OFFBOARD".equals(run.getKind()) ? "OFFBOARDING_COMPLETED" : "ONBOARDING_COMPLETED", callerId,
                Map.of("subject", run.getSubjectName()));
        }
        return getRun(callerId, runId);
    }

    @Transactional
    public Map<String, Object> cancelRun(String callerId, String runId) {
        OnboardingRun run = loadRun(callerId, runId);
        run.setStatus("CANCELLED");
        run.setUpdatedAt(OffsetDateTime.now());
        runs.save(run);
        return getRun(callerId, runId);
    }

    private OnboardingRun loadRun(String callerId, String runId) {
        OnboardingRun run = runs.findById(runId).orElseThrow(() -> ApiException.notFound("OnboardingRun", runId));
        requireAdmin(callerId, run.getWorkspaceId());
        return run;
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
