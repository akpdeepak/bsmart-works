package com.bcits.works;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The I/O orchestration of the SLA engine (iteration 8, Cap M) — the thin wrapper around the pure
 * {@link SlaCalculationService}. For an active {@link SlaPolicy} it finds the in-scope work items
 * (workspace-scoped, parameterized BQL — RB-40 §1 / RB-10 §6), starts a clock per {@link SlaTarget}
 * when the start trigger is met, and advances existing clocks: accruing business time, pausing,
 * resuming, settling to MET/BREACHED, and firing escalations at consumed-percent thresholds or on
 * breach. Every transition is recorded to the append-only {@code events} table (RB-10 §3), so the
 * SLA audit log is rebuildable. Defensive: a malformed policy is skipped, never aborting a batch.
 */
@Service
public class SlaEvaluationService {

    private static final Logger log = LoggerFactory.getLogger(SlaEvaluationService.class);
    private static final List<String> LIVE_STATES = List.of("RUNNING", "PAUSED");

    private final JdbcTemplate jdbc;
    private final BqlCompiler compiler;
    private final SlaPolicyRepository policies;
    private final SlaTargetRepository targets;
    private final SlaInstanceRepository instances;
    private final SlaEscalationRepository escalations;
    private final SlaCalendarRepository calendars;
    private final SlaCalculationService calc;
    private final SlaNotificationService notifier;
    private final EventService eventService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SlaEvaluationService(JdbcTemplate jdbc, BqlCompiler compiler, SlaPolicyRepository policies,
                                SlaTargetRepository targets, SlaInstanceRepository instances,
                                SlaEscalationRepository escalations, SlaCalendarRepository calendars,
                                SlaCalculationService calc, SlaNotificationService notifier,
                                EventService eventService) {
        this.jdbc = jdbc;
        this.compiler = compiler;
        this.policies = policies;
        this.targets = targets;
        this.instances = instances;
        this.escalations = escalations;
        this.calendars = calendars;
        this.calc = calc;
        this.notifier = notifier;
        this.eventService = eventService;
    }

    /** A scoped work item with the fields the engine needs. */
    public record ScopedItem(String id, String title, String status, String projectId,
                             String assigneeId, String createdBy) { }

    /** Outcome of one policy evaluation, for logs and the on-demand endpoint. */
    public record EvaluationResult(int scoped, int started, int advanced) { }

    // ── Evaluation ──────────────────────────────────────────────────────────────

    /** Start clocks for newly in-scope items and advance every existing clock for this policy. */
    public EvaluationResult evaluatePolicy(SlaPolicy policy) {
        if (policy.getActive() == null || !policy.getActive()) {
            return new EvaluationResult(0, 0, 0);
        }
        List<ScopedItem> scoped;
        try {
            scoped = findScopedItems(policy);
        } catch (RuntimeException ex) {
            log.warn("[SLA] Policy {} could not be evaluated: {}", policy.getId(), ex.getMessage());
            return new EvaluationResult(0, 0, 0);
        }
        List<SlaTarget> policyTargets = targets.findByPolicyIdOrderBySortOrderAsc(policy.getId());
        List<SlaEscalation> policyEscalations = escalations.findByPolicyIdOrderBySortOrderAsc(policy.getId());
        SlaCalculationService.BusinessCalendar cal = calendarFor(policy);

        int started = 0;
        int advanced = 0;
        OffsetDateTime now = OffsetDateTime.now();
        for (ScopedItem item : scoped) {
            for (SlaTarget target : policyTargets) {
                Optional<SlaInstance> existing = instances.findByWorkItemIdAndTargetId(item.id(), target.getId());
                if (existing.isPresent()) {
                    if (advance(existing.get(), item, target, cal, policyEscalations, now)) {
                        advanced++;
                    }
                } else if (shouldStart(target, item)) {
                    start(policy, target, item, cal, now);
                    started++;
                }
            }
        }
        return new EvaluationResult(scoped.size(), started, advanced);
    }

    /** Advance every live clock across all active policies — the scheduler's sweep. */
    public int sweep() {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): the SLA clock sweep is a
        // cross-tenant background job (SlaClockScheduler thread, plus tests) that reads active SLA
        // policies across ALL workspaces and accrues clocks for in-scope items in every tenant. The
        // central tenant filter must be off so this all-workspace read is the explicit, audited
        // unscoped path; each policy's scope is enforced by its own workspace-scoped, parameterized BQL
        // in findScopedItems.
        return TenantScope.callAsSystem(() -> {
            int advanced = 0;
            for (SlaPolicy policy : policies.findByActiveTrue()) {
                advanced += evaluatePolicy(policy).advanced();
            }
            return advanced;
        });
    }

    /** Bulk apply: start clocks for every in-scope item now (preview is {@link #preview}). */
    public EvaluationResult applyNow(SlaPolicy policy) {
        return evaluatePolicy(policy);
    }

    /** Dry run for the policy's scope: how many items it currently covers, with a small sample. */
    public Map<String, Object> preview(SlaPolicy policy) {
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            List<ScopedItem> scoped = findScopedItems(policy);
            result.put("valid", true);
            result.put("scoped", scoped.size());
            result.put("sample", scoped.stream().limit(10)
                .map(s -> Map.of("id", s.id(), "title", s.title() == null ? "" : s.title()))
                .toList());
        } catch (RuntimeException ex) {
            result.put("valid", false);
            result.put("error", ex.getMessage());
        }
        return result;
    }

    // ── Internals ────────────────────────────────────────────────────────────────

    private boolean shouldStart(SlaTarget target, ScopedItem item) {
        // Don't start a clock for an item already at the stop status (nothing to measure).
        if (target.getStopStatus() != null && target.getStopStatus().equalsIgnoreCase(item.status())) {
            return false;
        }
        // start_status null = start as soon as the item is in scope; otherwise wait for that status.
        return target.getStartStatus() == null || target.getStartStatus().isBlank()
            || target.getStartStatus().equalsIgnoreCase(item.status());
    }

    private void start(SlaPolicy policy, SlaTarget target, ScopedItem item,
                       SlaCalculationService.BusinessCalendar cal, OffsetDateTime now) {
        SlaInstance i = new SlaInstance();
        i.setId("SLI-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        i.setWorkspaceId(policy.getWorkspaceId());
        i.setWorkItemId(item.id());
        i.setPolicyId(policy.getId());
        i.setTargetId(target.getId());
        i.setMetric(target.getMetric());
        i.setState("RUNNING");
        i.setTargetMinutes(target.getTargetMinutes());
        i.setElapsedMinutes(0);
        i.setStartedAt(now);
        i.setLastResumedAt(now);
        i.setDueAt(calc.addBusinessMinutes(now, target.getTargetMinutes(), cal));
        i.setCreatedAt(now);
        i.setUpdatedAt(now);
        instances.save(i);
        eventService.record(i.getId(), "SLA_STARTED", "system", Map.of(
            "policyId", policy.getId(), "workItemId", item.id(),
            "metric", target.getMetric(), "targetMinutes", target.getTargetMinutes()));
    }

    /** Advance one clock; returns true if its state/elapsed changed. */
    private boolean advance(SlaInstance i, ScopedItem item, SlaTarget target,
                            SlaCalculationService.BusinessCalendar cal,
                            List<SlaEscalation> policyEscalations, OffsetDateTime now) {
        if (!LIVE_STATES.contains(i.getState())) {
            return false;
        }
        Set<String> pauses = parsePauseStatuses(target.getPauseStatuses());
        SlaCalculationService.ClockState next = calc.advance(
            i.getState(), i.getElapsedMinutes(), i.getLastResumedAt(), i.getTargetMinutes(),
            item.status(), pauses, target.getStopStatus(), cal, now);

        int liveElapsed = "RUNNING".equals(i.getState())
            ? i.getElapsedMinutes() + (int) calc.businessMinutesBetween(i.getLastResumedAt(), now, cal)
            : i.getElapsedMinutes();

        boolean changed = !next.state().equals(i.getState());
        i.setUpdatedAt(now);

        if (next.metNow()) {
            i.setState("MET");
            i.setElapsedMinutes(next.elapsedMinutes());
            i.setCompletedAt(now);
            instances.save(i);
            eventService.record(i.getId(), "SLA_MET", "system",
                Map.of("workItemId", i.getWorkItemId(), "metric", i.getMetric()));
            return true;
        }
        if (next.breachedNow()) {
            i.setState("BREACHED");
            i.setElapsedMinutes(next.elapsedMinutes());
            i.setBreachedAt(now);
            if (target.getStopStatus() != null && target.getStopStatus().equalsIgnoreCase(item.status())) {
                i.setCompletedAt(now);
            }
            instances.save(i);
            eventService.record(i.getId(), "SLA_BREACHED", "system",
                Map.of("workItemId", i.getWorkItemId(), "metric", i.getMetric(),
                    "elapsedMinutes", next.elapsedMinutes(), "targetMinutes", i.getTargetMinutes()));
            fireEscalations(i, item, policyEscalations, 100, true);
            return true;
        }
        if (next.pausedNow()) {
            i.setState("PAUSED");
            i.setElapsedMinutes(next.elapsedMinutes());
            i.setPausedAt(now);
            i.setLastResumedAt(null);
            instances.save(i);
            eventService.record(i.getId(), "SLA_PAUSED", "system",
                Map.of("workItemId", i.getWorkItemId(), "status", safe(item.status())));
            return true;
        }
        if (next.resumedNow()) {
            i.setState("RUNNING");
            i.setLastResumedAt(now);
            i.setPausedAt(null);
            int remaining = Math.max(0, i.getTargetMinutes() - i.getElapsedMinutes());
            i.setDueAt(calc.addBusinessMinutes(now, remaining, cal));
            instances.save(i);
            eventService.record(i.getId(), "SLA_RESUMED", "system",
                Map.of("workItemId", i.getWorkItemId(), "status", safe(item.status())));
            return true;
        }
        // Still running within budget — check threshold escalations against live consumption.
        int pct = calc.consumptionPercent(liveElapsed, i.getTargetMinutes());
        boolean fired = fireEscalations(i, item, policyEscalations, pct, false);
        if (fired) {
            instances.save(i);
        }
        return changed || fired;
    }

    /** Fire any due escalation steps not already fired for this clock; returns true if any fired. */
    private boolean fireEscalations(SlaInstance i, ScopedItem item, List<SlaEscalation> steps,
                                    int consumedPct, boolean breached) {
        if (steps.isEmpty()) {
            return false;
        }
        List<String> fired = parseFiredSteps(i.getEscalatedSteps());
        boolean any = false;
        for (SlaEscalation step : steps) {
            if (step.getTargetId() != null && !step.getTargetId().equals(i.getTargetId())) {
                continue;
            }
            if (fired.contains(step.getId())) {
                continue;
            }
            boolean due = (Boolean.TRUE.equals(step.getOnBreach()) && breached)
                || (step.getThresholdPercent() != null && consumedPct >= step.getThresholdPercent());
            if (!due) {
                continue;
            }
            notifier.routeEscalation(step, i, item.title());
            eventService.record(i.getId(), "SLA_ESCALATED", "system", Map.of(
                "workItemId", i.getWorkItemId(), "escalationId", step.getId(),
                "action", safe(step.getAction()), "consumedPercent", consumedPct));
            fired.add(step.getId());
            any = true;
        }
        if (any) {
            i.setEscalatedSteps(writeFiredSteps(fired));
        }
        return any;
    }

    /** Run the policy's scope as one workspace-scoped, parameterized query (RB-40 §1, RB-10 §6). */
    List<ScopedItem> findScopedItems(SlaPolicy policy) {
        StringBuilder sql = new StringBuilder(
            "SELECT id, title, status, project_id, assignee_id, created_by FROM work_items "
            + "WHERE deleted_at IS NULL "
            + "AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)");
        List<Object> params = new ArrayList<>();
        params.add(policy.getWorkspaceId());

        String actor = policy.getCreatedBy() == null ? "system" : policy.getCreatedBy();
        BqlCompiler.Compiled scope = compiler.compile(policy.getScopeBql() == null ? "" : policy.getScopeBql(), actor);
        if (!scope.sql().isEmpty()) {
            sql.append(" AND (").append(scope.sql()).append(")");
            params.addAll(scope.params());
        }
        sql.append(" ORDER BY id LIMIT 1000");
        return jdbc.query(sql.toString(), (rs, n) -> new ScopedItem(
            rs.getString("id"), rs.getString("title"), rs.getString("status"),
            rs.getString("project_id"), rs.getString("assignee_id"), rs.getString("created_by")),
            params.toArray());
    }

    private SlaCalculationService.BusinessCalendar calendarFor(SlaPolicy policy) {
        if (policy.getCalendarId() == null) {
            return null; // 24x7
        }
        return calendars.findById(policy.getCalendarId())
            .map(c -> calc.from(c.getTimezone(), c.getWorkWeek(), c.getHolidays()))
            .orElse(null);
    }

    private Set<String> parsePauseStatuses(String json) {
        if (json == null || json.isBlank()) {
            return Set.of();
        }
        try {
            List<?> raw = objectMapper.readValue(json, List.class);
            return raw.stream().map(Object::toString).collect(Collectors.toSet());
        } catch (Exception ex) {
            return Set.of();
        }
    }

    private List<String> parseFiredSteps(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            List<?> raw = objectMapper.readValue(json, List.class);
            return new ArrayList<>(raw.stream().map(Object::toString).toList());
        } catch (Exception ex) {
            return new ArrayList<>();
        }
    }

    private String writeFiredSteps(List<String> ids) {
        try {
            return objectMapper.writeValueAsString(ids);
        } catch (Exception ex) {
            return "[]";
        }
    }

    private String safe(String s) { return s == null ? "" : s; }
}
