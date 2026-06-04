package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The SLA runtime: it starts, pauses, resumes, completes and breaches SLA clocks in
 * response to work-item lifecycle events, exposes the live countdown state, and powers the
 * audit log (sourced from the event store, RB-10 §3) and reporting.
 *
 * <p>Business-hours arithmetic is delegated to {@link BusinessHoursCalculator}; field maths
 * to {@link SlaPolicyService}. Every clock transition is recorded as an event keyed on the
 * work item, so the SLA audit trail is immutable and reconstructible.
 *
 * <p>The lifecycle hooks ({@link #onWorkItemCreated}, {@link #onStatusChange}) are wrapped so
 * a misconfigured policy can never break the core work-item write (graceful degradation).
 */
@Service
public class SlaEngineService {

    private static final Logger log = LoggerFactory.getLogger(SlaEngineService.class);
    private static final List<String> TERMINAL = List.of("MET", "BREACHED", "STOPPED");

    private final SlaPolicyRepository policyRepo;
    private final SlaTargetRepository targetRepo;
    private final SlaEscalationRepository escalationRepo;
    private final SlaInstanceRepository instanceRepo;
    private final BusinessCalendarRepository calendarRepo;
    private final BusinessHoursCalculator calc;
    private final SlaPolicyService policyService;
    private final RbacService rbac;
    private final EventService eventService;
    private final NotificationBatchService notifications;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SlaEngineService(SlaPolicyRepository policyRepo, SlaTargetRepository targetRepo,
                            SlaEscalationRepository escalationRepo, SlaInstanceRepository instanceRepo,
                            BusinessCalendarRepository calendarRepo, BusinessHoursCalculator calc,
                            SlaPolicyService policyService, RbacService rbac, EventService eventService,
                            NotificationBatchService notifications, JdbcTemplate jdbc) {
        this.policyRepo = policyRepo;
        this.targetRepo = targetRepo;
        this.escalationRepo = escalationRepo;
        this.instanceRepo = instanceRepo;
        this.calendarRepo = calendarRepo;
        this.calc = calc;
        this.policyService = policyService;
        this.rbac = rbac;
        this.eventService = eventService;
        this.notifications = notifications;
        this.jdbc = jdbc;
    }

    // ── Calendar model ─────────────────────────────────────────────────────────

    BusinessHoursCalculator.Model modelFor(SlaPolicy policy) {
        BusinessCalendar cal = null;
        if (policy.getCalendarId() != null) {
            cal = calendarRepo.findById(policy.getCalendarId()).orElse(null);
        }
        if (cal == null && policy.getWorkspaceId() != null) {
            cal = calendarRepo.findFirstByWorkspaceIdAndIsDefaultTrue(policy.getWorkspaceId()).orElse(null);
        }
        if (cal == null) {
            return calc.alwaysOn(ZoneId.of("Asia/Kolkata"));
        }
        return calc.parse(cal.getTimezone(), cal.getWorkWeek(), cal.getHolidays());
    }

    private List<String> parseStringArray(String json) {
        List<String> out = new ArrayList<>();
        try {
            JsonNode arr = objectMapper.readTree(json == null || json.isBlank() ? "[]" : json);
            if (arr.isArray()) {
                arr.forEach(n -> out.add(n.asText()));
            }
        } catch (Exception ignored) {
            // a malformed list simply means "no statuses"
        }
        return out;
    }

    // ── Lifecycle hooks (called from WorkItemController) ───────────────────────

    /** A new work item may fall into the scope of one or more active policies. */
    @Transactional
    public void onWorkItemCreated(String workItemId, String projectId, String actorId) {
        try {
            applyMatchingPolicies(workItemId, projectId, "Todo", actorId);
        } catch (Exception e) {
            log.warn("SLA onWorkItemCreated failed for {} (non-fatal): {}", workItemId, e.toString());
        }
    }

    /** A status change can start, pause, resume or fulfil a target's clock. */
    @Transactional
    public void onStatusChange(String workItemId, String projectId, String oldStatus,
                               String newStatus, String actorId) {
        try {
            // Items can enter a policy's scope at any point in their life, so re-check first.
            applyMatchingPolicies(workItemId, projectId, newStatus, actorId);
            for (SlaInstance inst : instanceRepo.findByWorkItemIdOrderByMetricAsc(workItemId)) {
                if (TERMINAL.contains(inst.getStatus())) {
                    continue;
                }
                try {
                    handleStatusChange(inst, newStatus, actorId);
                } catch (Exception e) {
                    log.warn("SLA status handling failed for instance {} (non-fatal): {}", inst.getId(), e.toString());
                }
            }
        } catch (Exception e) {
            log.warn("SLA onStatusChange failed for {} (non-fatal): {}", workItemId, e.toString());
        }
    }

    private void handleStatusChange(SlaInstance inst, String newStatus, String actorId) {
        SlaPolicy policy = policyRepo.findById(inst.getPolicyId()).orElse(null);
        SlaTarget target = targetRepo.findById(inst.getTargetId()).orElse(null);
        if (policy == null || target == null) {
            return;
        }
        BusinessHoursCalculator.Model model = modelFor(policy);
        boolean shouldPause = parseStringArray(policy.getPauseStatuses()).contains(newStatus);
        List<String> stopStatuses = policyService.parseStopStatuses(target.getStopStatus());
        Instant now = Instant.now();

        // 1. A pending clock starts when the item reaches the target's start status.
        if ("PENDING".equals(inst.getStatus()) && target.getStartStatus() != null
                && target.getStartStatus().equals(newStatus) && !shouldPause) {
            startClock(inst, model, now, actorId);
            return;
        }
        // 2. Reaching a stop status fulfils the target (MET) — wins over pause/resume.
        if (stopStatuses.contains(newStatus) && !"PENDING".equals(inst.getStatus())) {
            completeMet(inst, model, now, actorId);
            return;
        }
        if ("PENDING".equals(inst.getStatus())) {
            return; // not started yet — nothing to pause/resume
        }
        // 3. Pause / resume on the policy's pause statuses.
        if (shouldPause && "RUNNING".equals(inst.getStatus())) {
            pauseClock(inst, model, now, actorId);
        } else if (!shouldPause && "PAUSED".equals(inst.getStatus())) {
            resumeClock(inst, model, now, actorId);
        }
    }

    // ── Clock transitions ──────────────────────────────────────────────────────

    private void startClock(SlaInstance inst, BusinessHoursCalculator.Model model, Instant now, String actorId) {
        long targetSeconds = (long) inst.getTargetMinutes() * 60;
        inst.setStatus("RUNNING");
        inst.setStartedAt(OffsetDateTime.ofInstant(now, ZoneId.systemDefault()));
        inst.setRunningSince(inst.getStartedAt());
        inst.setConsumedSeconds(0L);
        inst.setDueAt(OffsetDateTime.ofInstant(calc.dueAt(model, now, targetSeconds), ZoneId.systemDefault()));
        inst.setUpdatedAt(inst.getStartedAt());
        instanceRepo.save(inst);
        record(inst, "SLA_STARTED", actorId);
    }

    private void pauseClock(SlaInstance inst, BusinessHoursCalculator.Model model, Instant now, String actorId) {
        long elapsed = calc.elapsedBusinessSeconds(model, inst.getRunningSince().toInstant(), now);
        inst.setConsumedSeconds((inst.getConsumedSeconds() == null ? 0 : inst.getConsumedSeconds()) + elapsed);
        inst.setRunningSince(null);
        inst.setPausedAt(OffsetDateTime.ofInstant(now, ZoneId.systemDefault()));
        inst.setStatus("PAUSED");
        inst.setUpdatedAt(inst.getPausedAt());
        instanceRepo.save(inst);
        record(inst, "SLA_PAUSED", actorId);
    }

    private void resumeClock(SlaInstance inst, BusinessHoursCalculator.Model model, Instant now, String actorId) {
        long targetSeconds = (long) inst.getTargetMinutes() * 60;
        long remaining = Math.max(0, targetSeconds - (inst.getConsumedSeconds() == null ? 0 : inst.getConsumedSeconds()));
        inst.setRunningSince(OffsetDateTime.ofInstant(now, ZoneId.systemDefault()));
        inst.setPausedAt(null);
        inst.setStatus("RUNNING");
        inst.setDueAt(OffsetDateTime.ofInstant(calc.dueAt(model, now, remaining), ZoneId.systemDefault()));
        inst.setUpdatedAt(inst.getRunningSince());
        instanceRepo.save(inst);
        record(inst, "SLA_RESUMED", actorId);
    }

    private void completeMet(SlaInstance inst, BusinessHoursCalculator.Model model, Instant now, String actorId) {
        if ("RUNNING".equals(inst.getStatus()) && inst.getRunningSince() != null) {
            long elapsed = calc.elapsedBusinessSeconds(model, inst.getRunningSince().toInstant(), now);
            inst.setConsumedSeconds((inst.getConsumedSeconds() == null ? 0 : inst.getConsumedSeconds()) + elapsed);
        }
        inst.setRunningSince(null);
        inst.setStatus("MET");
        inst.setCompletedAt(OffsetDateTime.ofInstant(now, ZoneId.systemDefault()));
        inst.setUpdatedAt(inst.getCompletedAt());
        instanceRepo.save(inst);
        record(inst, "SLA_MET", actorId);
    }

    // ── Applying policies ──────────────────────────────────────────────────────

    private void applyMatchingPolicies(String workItemId, String projectId, String currentStatus, String actorId) {
        String wsId = rbac.workspaceForProject(projectId);
        if (wsId == null) {
            return;
        }
        for (SlaPolicy policy : policyRepo.findByWorkspaceIdAndActiveTrue(wsId)) {
            if (!matchesScope(policy, workItemId, projectId, actorId)) {
                continue;
            }
            applyPolicyToItem(policy, workItemId, currentStatus, actorId);
        }
    }

    /** Create a clock per target for this item if one does not already exist. */
    int applyPolicyToItem(SlaPolicy policy, String workItemId, String currentStatus, String actorId) {
        BusinessHoursCalculator.Model model = modelFor(policy);
        boolean shouldPause = parseStringArray(policy.getPauseStatuses()).contains(currentStatus);
        int created = 0;
        for (SlaTarget target : targetRepo.findByPolicyIdOrderBySortOrderAsc(policy.getId())) {
            if (instanceRepo.findByWorkItemIdAndTargetId(workItemId, target.getId()).isPresent()) {
                continue;
            }
            boolean startNow = (target.getStartStatus() == null || target.getStartStatus().equals(currentStatus))
                    && !shouldPause;
            Instant now = Instant.now();
            OffsetDateTime nowOdt = OffsetDateTime.ofInstant(now, ZoneId.systemDefault());
            SlaInstance inst = new SlaInstance();
            inst.setId("SLI-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
            inst.setWorkspaceId(policy.getWorkspaceId());
            inst.setWorkItemId(workItemId);
            inst.setPolicyId(policy.getId());
            inst.setTargetId(target.getId());
            inst.setMetric(target.getMetric());
            inst.setTargetMinutes(target.getTargetMinutes());
            inst.setConsumedSeconds(0L);
            inst.setLastEscalationPct(0);
            inst.setCreatedAt(nowOdt);
            inst.setUpdatedAt(nowOdt);
            if (startNow) {
                inst.setStatus("RUNNING");
                inst.setStartedAt(nowOdt);
                inst.setRunningSince(nowOdt);
                inst.setDueAt(OffsetDateTime.ofInstant(
                        calc.dueAt(model, now, (long) target.getTargetMinutes() * 60), ZoneId.systemDefault()));
            } else {
                inst.setStatus("PENDING");
            }
            instanceRepo.save(inst);
            record(inst, startNow ? "SLA_STARTED" : "SLA_APPLIED", actorId);
            created++;
        }
        return created;
    }

    /** Project filter + optional BQL membership test. Fails closed (skip) on a bad BQL scope. */
    boolean matchesScope(SlaPolicy policy, String workItemId, String projectId, String actorId) {
        if (policy.getProjectId() != null && !policy.getProjectId().equals(projectId)) {
            return false;
        }
        String scope = policy.getScopeBql() == null ? "" : policy.getScopeBql().trim();
        if (scope.isEmpty()) {
            return true;
        }
        try {
            BqlCompiler.Compiled compiled = new BqlCompiler().compile(scope, actorId);
            if (compiled.sql().isBlank()) {
                return true;
            }
            List<Object> params = new ArrayList<>();
            params.add(workItemId);
            params.addAll(compiled.params());
            Integer hit = jdbc.query(
                    "SELECT 1 FROM work_items WHERE id = ? AND (" + compiled.sql() + ") LIMIT 1",
                    rs -> rs.next() ? 1 : 0, params.toArray());
            return hit != null && hit == 1;
        } catch (Exception e) {
            log.warn("SLA policy {} has an invalid scope BQL; not applied: {}", policy.getId(), e.toString());
            return false;
        }
    }

    private void record(SlaInstance inst, String eventType, String actorId) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("instanceId", inst.getId());
        payload.put("policyId", inst.getPolicyId());
        payload.put("targetId", inst.getTargetId());
        payload.put("metric", inst.getMetric());
        eventService.record(inst.getWorkItemId(), eventType, actorId, payload);
    }

    // ── Read surface (countdown, audit, report) ────────────────────────────────

    /** Live SLA state for a work item: remaining seconds, consumed %, and a status colour. */
    public List<Map<String, Object>> instancesForItem(String callerId, String workItemId) {
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Work item", workItemId);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (SlaInstance inst : instanceRepo.findByWorkItemIdOrderByMetricAsc(workItemId)) {
            out.add(describe(inst));
        }
        return out;
    }

    Map<String, Object> describe(SlaInstance inst) {
        Instant now = Instant.now();
        long targetSeconds = (long) (inst.getTargetMinutes() == null ? 0 : inst.getTargetMinutes()) * 60;
        long elapsedLive = 0;
        if ("RUNNING".equals(inst.getStatus()) && inst.getRunningSince() != null) {
            SlaPolicy policy = policyRepo.findById(inst.getPolicyId()).orElse(null);
            if (policy != null) {
                elapsedLive = calc.elapsedBusinessSeconds(modelFor(policy), inst.getRunningSince().toInstant(), now);
            }
        }
        long consumed = policyService.totalConsumed(inst, elapsedLive);
        long remaining = Math.max(0, targetSeconds - consumed);
        int pct = policyService.consumedPercent(inst, consumed);
        boolean breached = "BREACHED".equals(inst.getStatus()) || (("RUNNING".equals(inst.getStatus()))
                && inst.getDueAt() != null && !now.isBefore(inst.getDueAt().toInstant()));

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", inst.getId());
        m.put("workItemId", inst.getWorkItemId());
        m.put("policyId", inst.getPolicyId());
        m.put("targetId", inst.getTargetId());
        m.put("metric", inst.getMetric());
        m.put("status", inst.getStatus());
        m.put("targetMinutes", inst.getTargetMinutes());
        m.put("consumedSeconds", consumed);
        m.put("remainingSeconds", remaining);
        m.put("consumedPercent", pct);
        m.put("dueAt", inst.getDueAt());
        m.put("breached", breached);
        m.put("color", breached ? "danger" : (pct >= 50 ? "warning" : "success"));
        return m;
    }

    /** SLA audit trail for a work item — sourced immutably from the event store (I08-S08). */
    public List<Map<String, Object>> audit(String callerId, String workItemId) {
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Work item", workItemId);
        }
        return jdbc.queryForList(
                "SELECT event_type, actor_id, payload, occurred_at FROM events "
                + "WHERE aggregate_id = ? AND event_type LIKE 'SLA\\_%' ORDER BY occurred_at ASC",
                workItemId);
    }

    /** Met / breached / in-flight counts per policy for a workspace (I08-S07). */
    public Map<String, Object> report(String callerId, String workspaceId) {
        if (rbac.getUserTier(callerId, workspaceId) < 1) {
            throw ApiException.notFound("Workspace", workspaceId);
        }
        List<Map<String, Object>> byPolicy = jdbc.queryForList(
                "SELECT i.policy_id, p.name AS policy_name, "
                + "  COUNT(*) FILTER (WHERE i.status = 'MET') AS met, "
                + "  COUNT(*) FILTER (WHERE i.status = 'BREACHED') AS breached, "
                + "  COUNT(*) FILTER (WHERE i.status IN ('RUNNING','PAUSED','PENDING')) AS in_flight, "
                + "  COUNT(*) AS total "
                + "FROM sla_instances i LEFT JOIN sla_policies p ON p.id = i.policy_id "
                + "WHERE i.workspace_id = ? GROUP BY i.policy_id, p.name ORDER BY p.name",
                workspaceId);
        long met = byPolicy.stream().mapToLong(r -> ((Number) r.get("met")).longValue()).sum();
        long breached = byPolicy.stream().mapToLong(r -> ((Number) r.get("breached")).longValue()).sum();
        long inFlight = byPolicy.stream().mapToLong(r -> ((Number) r.get("in_flight")).longValue()).sum();
        long settled = met + breached;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("met", met);
        out.put("breached", breached);
        out.put("inFlight", inFlight);
        out.put("compliancePercent", settled == 0 ? 100 : Math.round(met * 100.0 / settled));
        out.put("byPolicy", byPolicy);
        return out;
    }

    // ── Scheduler entry point: detect breaches + run escalations ───────────────

    /** Recompute live clocks, mark breaches, and fire due escalation steps. Returns a count. */
    @Transactional
    public int evaluateActiveClocks() {
        int actions = 0;
        for (SlaInstance inst : instanceRepo.findByStatusIn(List.of("RUNNING"))) {
            SlaPolicy policy = policyRepo.findById(inst.getPolicyId()).orElse(null);
            if (policy == null) {
                continue;
            }
            BusinessHoursCalculator.Model model = modelFor(policy);
            Instant now = Instant.now();
            long elapsedLive = inst.getRunningSince() == null ? 0
                    : calc.elapsedBusinessSeconds(model, inst.getRunningSince().toInstant(), now);
            long consumed = policyService.totalConsumed(inst, elapsedLive);
            int pct = policyService.consumedPercent(inst, consumed);

            boolean breachedNow = inst.getDueAt() != null && !now.isBefore(inst.getDueAt().toInstant());
            actions += runEscalations(inst, policy, pct, breachedNow);

            if (breachedNow) {
                inst.setStatus("BREACHED");
                inst.setBreachedAt(OffsetDateTime.ofInstant(now, ZoneId.systemDefault()));
                inst.setConsumedSeconds(consumed);
                inst.setRunningSince(null);
                inst.setUpdatedAt(inst.getBreachedAt());
                instanceRepo.save(inst);
                record(inst, "SLA_BREACHED", "system");
                actions++;
            }
        }
        return actions;
    }

    private int runEscalations(SlaInstance inst, SlaPolicy policy, int consumedPct, boolean breached) {
        int fired = 0;
        int already = inst.getLastEscalationPct() == null ? 0 : inst.getLastEscalationPct();
        int effectivePct = breached ? 100 : consumedPct;
        for (SlaEscalation esc : escalationRepo.findByPolicyIdOrderByThresholdPctAscSortOrderAsc(policy.getId())) {
            if (esc.getTargetId() != null && !esc.getTargetId().equals(inst.getTargetId())) {
                continue;
            }
            int threshold = esc.getThresholdPct() == null ? 80 : esc.getThresholdPct();
            if (effectivePct >= threshold && already < threshold) {
                executeEscalation(inst, esc);
                inst.setLastEscalationPct(threshold);
                already = threshold;
                instanceRepo.save(inst);
                fired++;
            }
        }
        return fired;
    }

    private void executeEscalation(SlaInstance inst, SlaEscalation esc) {
        String link = "/items/" + inst.getWorkItemId();
        if ("REASSIGN".equals(esc.getAction()) && esc.getReassignTo() != null) {
            jdbc.update("UPDATE work_items SET assignee_id = ? WHERE id = ?", esc.getReassignTo(), inst.getWorkItemId());
            notifications.createIfNotBatched(esc.getReassignTo(), "SLA_ESCALATION",
                    "SLA escalation: " + inst.getWorkItemId() + " reassigned to you (" + esc.getThresholdPct() + "% consumed)", link);
        } else {
            for (String userId : parseStringArray(esc.getNotifyTo())) {
                notifications.createIfNotBatched(userId, "SLA_ESCALATION",
                        "SLA at " + esc.getThresholdPct() + "% on " + inst.getWorkItemId() + " (" + inst.getMetric() + ")", link);
            }
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("instanceId", inst.getId());
        payload.put("targetId", inst.getTargetId());
        payload.put("thresholdPct", esc.getThresholdPct());
        payload.put("action", esc.getAction());
        eventService.record(inst.getWorkItemId(), "SLA_ESCALATED", "system", payload);
    }
}
