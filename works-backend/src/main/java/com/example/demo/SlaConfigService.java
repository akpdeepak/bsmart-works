package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * SLA configuration surface (iteration 8, Cap M): policies, business-hours calendars,
 * targets, escalations, template cloning, and bulk application. This is the one place SLA
 * authorization and data access live (RB-10 §2; CLAUDE.md §4 — "RBAC in the service").
 *
 * <p><b>Tenant isolation (RB-40 §1):</b> reads first assert the caller is a member of the
 * owning workspace (a non-member gets 404, never confirming the row exists); mutations go
 * through {@link RbacService#require}(…, "manage_sla"), which is fail-closed for non-members.
 */
@Service
public class SlaConfigService {

    private final SlaPolicyRepository policyRepo;
    private final SlaTargetRepository targetRepo;
    private final SlaEscalationRepository escalationRepo;
    private final BusinessCalendarRepository calendarRepo;
    private final SlaPolicyService policyService;
    private final SlaEngineService engine;
    private final RbacService rbac;
    private final EventService eventService;
    private final JdbcTemplate jdbc;

    public SlaConfigService(SlaPolicyRepository policyRepo, SlaTargetRepository targetRepo,
                            SlaEscalationRepository escalationRepo, BusinessCalendarRepository calendarRepo,
                            SlaPolicyService policyService, SlaEngineService engine, RbacService rbac,
                            EventService eventService, JdbcTemplate jdbc) {
        this.policyRepo = policyRepo;
        this.targetRepo = targetRepo;
        this.escalationRepo = escalationRepo;
        this.calendarRepo = calendarRepo;
        this.policyService = policyService;
        this.engine = engine;
        this.rbac = rbac;
        this.eventService = eventService;
        this.jdbc = jdbc;
    }

    private void requireMember(String callerId, String workspaceId) {
        if (workspaceId == null || rbac.getUserTier(callerId, workspaceId) < 1) {
            throw ApiException.notFound("Workspace", String.valueOf(workspaceId));
        }
    }

    // ── Business-hours calendars (I08-S02) ─────────────────────────────────────

    public List<BusinessCalendar> listCalendars(String callerId, String workspaceId) {
        requireMember(callerId, workspaceId);
        return calendarRepo.findByWorkspaceIdOrderByNameAsc(workspaceId);
    }

    @Transactional
    public BusinessCalendar createCalendar(String callerId, String workspaceId, BusinessCalendar cal) {
        rbac.require(callerId, workspaceId, "manage_sla");
        cal.setId("CAL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        cal.setWorkspaceId(workspaceId);
        cal.setCreatedBy(callerId);
        if (cal.getTimezone() == null || cal.getTimezone().isBlank()) {
            cal.setTimezone("Asia/Kolkata");
        }
        if (cal.getWorkWeek() == null || cal.getWorkWeek().isBlank()) {
            cal.setWorkWeek("{}");
        }
        if (cal.getHolidays() == null || cal.getHolidays().isBlank()) {
            cal.setHolidays("[]");
        }
        cal.setIsDefault(cal.getIsDefault() != null && cal.getIsDefault());
        OffsetDateTime now = OffsetDateTime.now();
        cal.setCreatedAt(now);
        cal.setUpdatedAt(now);
        BusinessCalendar saved = calendarRepo.save(cal);
        eventService.record(saved.getId(), "SLA_CALENDAR_CREATED", callerId,
                Map.of("workspaceId", workspaceId, "name", saved.getName()));
        return saved;
    }

    @Transactional
    public BusinessCalendar updateCalendar(String callerId, String id, BusinessCalendar updated) {
        BusinessCalendar existing = calendarRepo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Calendar", id));
        rbac.require(callerId, existing.getWorkspaceId(), "manage_sla");
        existing.setName(updated.getName());
        if (updated.getTimezone() != null && !updated.getTimezone().isBlank()) {
            existing.setTimezone(updated.getTimezone());
        }
        if (updated.getWorkWeek() != null) {
            existing.setWorkWeek(updated.getWorkWeek());
        }
        if (updated.getHolidays() != null) {
            existing.setHolidays(updated.getHolidays());
        }
        if (updated.getIsDefault() != null) {
            existing.setIsDefault(updated.getIsDefault());
        }
        existing.setUpdatedAt(OffsetDateTime.now());
        BusinessCalendar saved = calendarRepo.save(existing);
        eventService.record(saved.getId(), "SLA_CALENDAR_UPDATED", callerId, Map.of("id", id));
        return saved;
    }

    @Transactional
    public void deleteCalendar(String callerId, String id) {
        BusinessCalendar existing = calendarRepo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Calendar", id));
        rbac.require(callerId, existing.getWorkspaceId(), "manage_sla");
        calendarRepo.deleteById(id);
        eventService.record(id, "SLA_CALENDAR_DELETED", callerId, Map.of("id", id));
    }

    // ── Policies (I08-S01) ─────────────────────────────────────────────────────

    public List<SlaPolicy> listPolicies(String callerId, String workspaceId) {
        requireMember(callerId, workspaceId);
        return policyRepo.findByWorkspaceIdOrderByNameAsc(workspaceId);
    }

    public List<SlaPolicy> listTemplates() {
        return policyRepo.findByIsTemplateTrueOrderByNameAsc();
    }

    public Map<String, Object> getPolicy(String callerId, String id) {
        SlaPolicy policy = policyRepo.findById(id).orElseThrow(() -> ApiException.notFound("SLA policy", id));
        requireMember(callerId, policy.getWorkspaceId());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("policy", policy);
        out.put("targets", targetRepo.findByPolicyIdOrderBySortOrderAsc(id));
        out.put("escalations", escalationRepo.findByPolicyIdOrderByThresholdPctAscSortOrderAsc(id));
        return out;
    }

    @Transactional
    public SlaPolicy createPolicy(String callerId, String workspaceId, SlaPolicy policy) {
        rbac.require(callerId, workspaceId, "manage_sla");
        SlaPolicy prepared = policyService.prepareNew(policy, callerId);
        prepared.setWorkspaceId(workspaceId);
        prepared.setIsTemplate(false); // workspace-created policies are never templates
        SlaPolicy saved = policyRepo.save(prepared);
        eventService.record(saved.getId(), "SLA_POLICY_CREATED", callerId,
                Map.of("workspaceId", workspaceId, "name", saved.getName()));
        return saved;
    }

    @Transactional
    public SlaPolicy updatePolicy(String callerId, String id, SlaPolicy updated) {
        SlaPolicy existing = policyRepo.findById(id).orElseThrow(() -> ApiException.notFound("SLA policy", id));
        rbac.require(callerId, existing.getWorkspaceId(), "manage_sla");
        SlaPolicy saved = policyRepo.save(policyService.applyUpdate(existing, updated));
        eventService.record(saved.getId(), "SLA_POLICY_UPDATED", callerId, Map.of("id", id));
        return saved;
    }

    @Transactional
    public SlaPolicy setActive(String callerId, String id, boolean active) {
        SlaPolicy existing = policyRepo.findById(id).orElseThrow(() -> ApiException.notFound("SLA policy", id));
        rbac.require(callerId, existing.getWorkspaceId(), "manage_sla");
        existing.setActive(active);
        existing.setUpdatedAt(OffsetDateTime.now());
        SlaPolicy saved = policyRepo.save(existing);
        eventService.record(saved.getId(), active ? "SLA_POLICY_ACTIVATED" : "SLA_POLICY_DEACTIVATED",
                callerId, Map.of("id", id));
        return saved;
    }

    @Transactional
    public void deletePolicy(String callerId, String id) {
        SlaPolicy existing = policyRepo.findById(id).orElseThrow(() -> ApiException.notFound("SLA policy", id));
        rbac.require(callerId, existing.getWorkspaceId(), "manage_sla");
        policyRepo.deleteById(id); // targets + escalations cascade (FK ON DELETE CASCADE)
        eventService.record(id, "SLA_POLICY_DELETED", callerId, Map.of("id", id));
    }

    /** Clone a global template into a workspace-owned, inactive policy with its targets. */
    @Transactional
    public SlaPolicy cloneTemplate(String callerId, String workspaceId, String templateId) {
        rbac.require(callerId, workspaceId, "manage_sla");
        SlaPolicy tpl = policyRepo.findById(templateId)
                .orElseThrow(() -> ApiException.notFound("SLA template", templateId));
        if (!Boolean.TRUE.equals(tpl.getIsTemplate())) {
            throw ApiException.badRequest("NOT_A_TEMPLATE", "That policy is not a template.");
        }
        SlaPolicy copy = new SlaPolicy();
        copy.setName(tpl.getName());
        copy.setDescription(tpl.getDescription());
        copy.setScopeBql(tpl.getScopeBql());
        copy.setPauseStatuses(tpl.getPauseStatuses());
        SlaPolicy saved = createPolicy(callerId, workspaceId, copy);
        for (SlaTarget t : targetRepo.findByPolicyIdOrderBySortOrderAsc(templateId)) {
            SlaTarget nt = new SlaTarget();
            nt.setMetric(t.getMetric());
            nt.setName(t.getName());
            nt.setTargetMinutes(t.getTargetMinutes());
            nt.setStartStatus(t.getStartStatus());
            nt.setStopStatus(t.getStopStatus());
            nt.setSortOrder(t.getSortOrder());
            targetRepo.save(policyService.prepareTarget(nt, saved.getId(), workspaceId));
        }
        return saved;
    }

    // ── Targets (I08-S03) ──────────────────────────────────────────────────────

    @Transactional
    public SlaTarget addTarget(String callerId, String policyId, SlaTarget target) {
        SlaPolicy policy = policyRepo.findById(policyId).orElseThrow(() -> ApiException.notFound("SLA policy", policyId));
        rbac.require(callerId, policy.getWorkspaceId(), "manage_sla");
        SlaTarget saved = targetRepo.save(policyService.prepareTarget(target, policyId, policy.getWorkspaceId()));
        eventService.record(policyId, "SLA_TARGET_ADDED", callerId,
                Map.of("policyId", policyId, "metric", saved.getMetric(), "targetMinutes", saved.getTargetMinutes()));
        return saved;
    }

    @Transactional
    public void deleteTarget(String callerId, String targetId) {
        SlaTarget t = targetRepo.findById(targetId).orElseThrow(() -> ApiException.notFound("SLA target", targetId));
        SlaPolicy policy = policyRepo.findById(t.getPolicyId())
                .orElseThrow(() -> ApiException.notFound("SLA policy", t.getPolicyId()));
        rbac.require(callerId, policy.getWorkspaceId(), "manage_sla");
        targetRepo.deleteById(targetId);
        eventService.record(t.getPolicyId(), "SLA_TARGET_REMOVED", callerId, Map.of("targetId", targetId));
    }

    // ── Escalations (I08-S06) ──────────────────────────────────────────────────

    @Transactional
    public SlaEscalation addEscalation(String callerId, String policyId, SlaEscalation esc) {
        SlaPolicy policy = policyRepo.findById(policyId).orElseThrow(() -> ApiException.notFound("SLA policy", policyId));
        rbac.require(callerId, policy.getWorkspaceId(), "manage_sla");
        SlaEscalation saved = escalationRepo.save(policyService.prepareEscalation(esc, policyId, policy.getWorkspaceId()));
        eventService.record(policyId, "SLA_ESCALATION_ADDED", callerId,
                Map.of("policyId", policyId, "thresholdPct", saved.getThresholdPct(), "action", saved.getAction()));
        return saved;
    }

    @Transactional
    public void deleteEscalation(String callerId, String escalationId) {
        SlaEscalation e = escalationRepo.findById(escalationId)
                .orElseThrow(() -> ApiException.notFound("SLA escalation", escalationId));
        SlaPolicy policy = policyRepo.findById(e.getPolicyId())
                .orElseThrow(() -> ApiException.notFound("SLA policy", e.getPolicyId()));
        rbac.require(callerId, policy.getWorkspaceId(), "manage_sla");
        escalationRepo.deleteById(escalationId);
        eventService.record(e.getPolicyId(), "SLA_ESCALATION_REMOVED", callerId, Map.of("escalationId", escalationId));
    }

    // ── Bulk application with preview (I08-S09) ────────────────────────────────

    /** Preview: which existing work items the policy would attach to (count + sample). */
    public Map<String, Object> previewBulkApply(String callerId, String policyId) {
        SlaPolicy policy = policyRepo.findById(policyId).orElseThrow(() -> ApiException.notFound("SLA policy", policyId));
        requireMember(callerId, policy.getWorkspaceId());
        List<Map<String, Object>> items = matchingItems(policy, callerId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("count", items.size());
        out.put("sample", items.size() > 25 ? items.subList(0, 25) : items);
        return out;
    }

    /** Commit: attach the policy's clocks to every matching work item. */
    @Transactional
    public Map<String, Object> commitBulkApply(String callerId, String policyId) {
        SlaPolicy policy = policyRepo.findById(policyId).orElseThrow(() -> ApiException.notFound("SLA policy", policyId));
        rbac.require(callerId, policy.getWorkspaceId(), "manage_sla");
        int created = 0;
        int items = 0;
        for (Map<String, Object> item : matchingItems(policy, callerId)) {
            String itemId = (String) item.get("id");
            String status = (String) item.get("status");
            created += engine.applyPolicyToItem(policy, itemId, status, callerId);
            items++;
        }
        eventService.record(policyId, "SLA_BULK_APPLIED", callerId,
                Map.of("policyId", policyId, "items", items, "clocksCreated", created));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("items", items);
        out.put("clocksCreated", created);
        return out;
    }

    private List<Map<String, Object>> matchingItems(SlaPolicy policy, String callerId) {
        // Single FROM work_items (no join) so bare column names emitted by the BQL compiler
        // resolve unambiguously; the workspace fence is a subquery on projects.
        StringBuilder sql = new StringBuilder(
                "SELECT id, title, status FROM work_items "
                + "WHERE deleted_at IS NULL "
                + "AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)");
        List<Object> params = new ArrayList<>();
        params.add(policy.getWorkspaceId());
        if (policy.getProjectId() != null) {
            sql.append(" AND project_id = ?");
            params.add(policy.getProjectId());
        }
        String scope = policy.getScopeBql() == null ? "" : policy.getScopeBql().trim();
        if (!scope.isEmpty()) {
            try {
                BqlCompiler.Compiled compiled = new BqlCompiler().compile(scope, callerId);
                if (!compiled.sql().isBlank()) {
                    sql.append(" AND (").append(compiled.sql()).append(")");
                    params.addAll(compiled.params());
                }
            } catch (Exception e) {
                throw ApiException.badRequest("INVALID_SCOPE", "The policy scope BQL is invalid: " + e.getMessage());
            }
        }
        sql.append(" ORDER BY created_at DESC LIMIT 1000");
        return jdbc.queryForList(sql.toString(), params.toArray());
    }
}
