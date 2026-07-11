package com.bcits.works.sla;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.BqlCompiler;
import com.bcits.works.shared.BqlException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * SLA policies (iteration 8, Cap M). The policy builder's backend: workspace-scoped CRUD, target and
 * escalation management, test-before-activate (preview), activate/deactivate, and bulk apply to the
 * current scope. RBAC lives here at the service boundary, never the UI (RB-10 §2): reads require
 * workspace membership ({@code view_items}); mutations require {@code manage_sla}. Scope BQL is
 * validated before save so an un-compilable policy can never be persisted, and field logic is
 * delegated to {@link SlaPolicyService}. Every mutation is recorded as an event (RB-10 §3).
 */
@RestController
@RequestMapping("/api/v1/sla/policies")
public class SlaPolicyController {

    private final SlaPolicyRepository policies;
    private final SlaTargetRepository targets;
    private final SlaEscalationRepository escalations;
    private final SlaPolicyService policyService;
    private final SlaEvaluationService evaluation;
    private final BqlCompiler compiler;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public SlaPolicyController(SlaPolicyRepository policies, SlaTargetRepository targets,
                              SlaEscalationRepository escalations, SlaPolicyService policyService,
                              SlaEvaluationService evaluation, BqlCompiler compiler,
                              EventService eventService, AuthenticatedUser authenticatedUser,
                              RbacGate rbac) {
        this.policies = policies;
        this.targets = targets;
        this.escalations = escalations;
        this.policyService = policyService;
        this.evaluation = evaluation;
        this.compiler = compiler;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<SlaPolicy> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        return policies.findByWorkspaceIdOrderByUpdatedAtDesc(workspaceId);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        SlaPolicy policy = load(id);
        rbac.require(authenticatedUser.id(), policy.getWorkspaceId(), "view_items");
        return Map.of(
            "policy", policy,
            "targets", targets.findByPolicyIdOrderBySortOrderAsc(id),
            "escalations", escalations.findByPolicyIdOrderBySortOrderAsc(id));
    }

    @PostMapping
    public SlaPolicy create(@Valid @RequestBody SlaPolicy policy) {
        String userId = authenticatedUser.id();
        if (policy.getWorkspaceId() == null || policy.getWorkspaceId().isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, policy.getWorkspaceId(), "manage_sla");
        validateScope(policy.getScopeBql());
        SlaPolicy saved = policies.save(policyService.prepareNew(policy, userId));
        eventService.record(saved.getId(), "SLA_POLICY_CREATED", userId,
            Map.of("name", safe(saved.getName()), "workspaceId", safe(saved.getWorkspaceId())));
        return saved;
    }

    @PutMapping("/{id}")
    public SlaPolicy update(@PathVariable String id, @Valid @RequestBody SlaPolicy updated) {
        String userId = authenticatedUser.id();
        SlaPolicy existing = load(id);
        rbac.require(userId, existing.getWorkspaceId(), "manage_sla");
        if (updated.getScopeBql() != null) {
            validateScope(updated.getScopeBql());
        }
        SlaPolicy saved = policies.save(policyService.applyUpdate(existing, updated));
        eventService.record(saved.getId(), "SLA_POLICY_UPDATED", userId, Map.of("name", safe(saved.getName())));
        return saved;
    }

    @PostMapping("/{id}/activate")
    public SlaPolicy activate(@PathVariable String id) {
        return setActive(id, true, "SLA_POLICY_ACTIVATED");
    }

    @PostMapping("/{id}/deactivate")
    public SlaPolicy deactivate(@PathVariable String id) {
        return setActive(id, false, "SLA_POLICY_DEACTIVATED");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        SlaPolicy policy = load(id);
        rbac.require(userId, policy.getWorkspaceId(), "manage_sla");
        policies.deleteById(id); // targets + escalations cascade via FK ON DELETE CASCADE
        eventService.record(id, "SLA_POLICY_DELETED", userId, Map.of("name", safe(policy.getName())));
        return ResponseEntity.noContent().build();
    }

    // ── Targets ────────────────────────────────────────────────────────────────

    @PutMapping("/{id}/targets")
    public List<SlaTarget> replaceTargets(@PathVariable String id, @Valid @RequestBody List<SlaTarget> incoming) {
        String userId = authenticatedUser.id();
        SlaPolicy policy = load(id);
        rbac.require(userId, policy.getWorkspaceId(), "manage_sla");
        for (SlaTarget t : incoming) {
            if (t.getTargetMinutes() == null || t.getTargetMinutes() <= 0) {
                throw ApiException.badRequest("INVALID_TARGET", "Each target needs a positive target time.");
            }
        }
        targets.deleteByPolicyId(id);
        int order = 0;
        for (SlaTarget t : incoming) {
            t.setSortOrder(order++);
            targets.save(policyService.prepareTarget(t, id, policy.getWorkspaceId()));
        }
        eventService.record(id, "SLA_TARGETS_UPDATED", userId, Map.of("count", incoming.size()));
        return targets.findByPolicyIdOrderBySortOrderAsc(id);
    }

    // ── Escalations ──────────────────────────────────────────────────────────────

    @PutMapping("/{id}/escalations")
    public List<SlaEscalation> replaceEscalations(@PathVariable String id,
                                                  @Valid @RequestBody List<SlaEscalation> incoming) {
        String userId = authenticatedUser.id();
        SlaPolicy policy = load(id);
        rbac.require(userId, policy.getWorkspaceId(), "manage_sla");
        escalations.deleteByPolicyId(id);
        int order = 0;
        for (SlaEscalation e : incoming) {
            e.setSortOrder(order++);
            escalations.save(policyService.prepareEscalation(e, id, policy.getWorkspaceId()));
        }
        eventService.record(id, "SLA_ESCALATIONS_UPDATED", userId, Map.of("count", incoming.size()));
        return escalations.findByPolicyIdOrderBySortOrderAsc(id);
    }

    // ── Preview + bulk apply ──────────────────────────────────────────────────────

    /** Test-before-activate / bulk preview: how many items the policy currently covers. */
    @PostMapping("/{id}/preview")
    public Map<String, Object> preview(@PathVariable String id) {
        SlaPolicy policy = load(id);
        rbac.require(authenticatedUser.id(), policy.getWorkspaceId(), "manage_sla");
        return evaluation.preview(policy);
    }

    /** Bulk apply: start clocks for every in-scope item now (the policy must be active). */
    @PostMapping("/{id}/apply")
    public Map<String, Object> apply(@PathVariable String id) {
        SlaPolicy policy = load(id);
        rbac.require(authenticatedUser.id(), policy.getWorkspaceId(), "manage_sla");
        if (policy.getActive() == null || !policy.getActive()) {
            throw ApiException.badRequest("POLICY_INACTIVE", "Activate the policy before applying it.");
        }
        SlaEvaluationService.EvaluationResult r = evaluation.applyNow(policy);
        return Map.of("scoped", r.scoped(), "started", r.started(), "advanced", r.advanced());
    }

    // ── helpers ───────────────────────────────────────────────────────────────────

    private SlaPolicy setActive(String id, boolean active, String eventType) {
        String userId = authenticatedUser.id();
        SlaPolicy policy = load(id);
        rbac.require(userId, policy.getWorkspaceId(), "manage_sla");
        if (active) {
            validateScope(policy.getScopeBql());
            if (targets.findByPolicyIdOrderBySortOrderAsc(id).isEmpty()) {
                throw ApiException.badRequest("NO_TARGETS", "Add at least one target before activating.");
            }
        }
        policy.setActive(active);
        SlaPolicy saved = policies.save(policy);
        eventService.record(id, eventType, userId, Map.of("name", safe(policy.getName())));
        return saved;
    }

    private SlaPolicy load(String id) {
        return policies.findById(id).orElseThrow(() -> ApiException.notFound("SLA policy", id));
    }

    private void validateScope(String scopeBql) {
        try {
            compiler.compile(scopeBql == null ? "" : scopeBql, "validate");
        } catch (BqlException e) {
            throw ApiException.badRequest("INVALID_BQL", "Invalid scope BQL: " + e.getMessage());
        }
    }

    private String safe(String s) { return s == null ? "" : s; }
}
