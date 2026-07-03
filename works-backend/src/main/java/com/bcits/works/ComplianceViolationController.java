package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Compliance violations (iteration 7, Cap K): the lifecycle surface over the rows that
 * {@link ComplianceEvaluationService} raises. Reads are workspace-scoped (RB-40 §1) and require
 * membership; lifecycle actions require {@code manage_compliance}. Transitions are pure
 * ({@link ComplianceViolationService}); each is recorded as an event (RB-10 §3) so the audit log
 * captures who acknowledged/resolved what and when.
 */
@RestController
@RequestMapping("/api/v1/compliance/violations")
public class ComplianceViolationController {

    private final ComplianceViolationRepository violations;
    private final ComplianceViolationService lifecycle;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public ComplianceViolationController(ComplianceViolationRepository violations,
                                         ComplianceViolationService lifecycle, EventService eventService,
                                         AuthenticatedUser authenticatedUser, RbacService rbac) {
        this.violations = violations;
        this.lifecycle = lifecycle;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<ComplianceViolation> list(@RequestParam String workspaceId,
                                          @RequestParam(required = false) String status,
                                          @RequestParam(required = false) String projectId) {
        rbac.require(authenticatedUser.id(), workspaceId, "view_items");
        if (status != null && !status.isBlank()) {
            return violations.findByWorkspaceIdAndStatusOrderByDetectedAtDesc(workspaceId, status.toUpperCase());
        }
        if (projectId != null && !projectId.isBlank()) {
            return violations.findByWorkspaceIdAndProjectIdOrderByDetectedAtDesc(workspaceId, projectId);
        }
        return violations.findByWorkspaceIdOrderByDetectedAtDesc(workspaceId);
    }

    @PostMapping("/{id}/acknowledge")
    public ComplianceViolation acknowledge(@PathVariable String id) {
        String userId = mutator(id);
        ComplianceViolation v = lifecycle.acknowledge(load(id), userId);
        ComplianceViolation saved = violations.save(v);
        eventService.record(id, "COMPLIANCE_VIOLATION_ACKNOWLEDGED", userId,
            Map.of("ruleId", safe(v.getRuleId()), "workItemId", safe(v.getWorkItemId())));
        return saved;
    }

    @PostMapping("/{id}/resolve")
    public ComplianceViolation resolve(@PathVariable String id,
                                       @RequestBody(required = false) Map<String, String> body) {
        String userId = mutator(id);
        String note = body == null ? null : body.get("note");
        ComplianceViolation saved = violations.save(lifecycle.resolve(load(id), userId, note));
        eventService.record(id, "COMPLIANCE_VIOLATION_RESOLVED", userId,
            Map.of("ruleId", safe(saved.getRuleId()), "workItemId", safe(saved.getWorkItemId())));
        return saved;
    }

    @PostMapping("/{id}/wont-fix")
    public ComplianceViolation wontFix(@PathVariable String id,
                                       @RequestBody(required = false) Map<String, String> body) {
        String userId = mutator(id);
        String note = body == null ? null : body.get("note");
        ComplianceViolation saved = violations.save(lifecycle.wontFix(load(id), userId, note));
        eventService.record(id, "COMPLIANCE_VIOLATION_WONT_FIX", userId,
            Map.of("ruleId", safe(saved.getRuleId()), "workItemId", safe(saved.getWorkItemId())));
        return saved;
    }

    /** Bulk acknowledgement: acknowledge every still-open violation in the id list (RB-7 spec). */
    @PostMapping("/bulk-acknowledge")
    public Map<String, Object> bulkAcknowledge(@RequestBody Map<String, List<String>> body) {
        String userId = authenticatedUser.id();
        List<String> ids = body.getOrDefault("ids", List.of());
        int acknowledged = 0;
        for (String id : ids) {
            ComplianceViolation v = violations.findById(id).orElse(null);
            if (v == null || v.getWorkspaceId() == null) continue; {
            rbac.require(userId, v.getWorkspaceId(), "manage_compliance");
            }
            if (!lifecycle.isOpen(v) || "ACKNOWLEDGED".equals(v.getStatus())) continue; {
            violations.save(lifecycle.acknowledge(v, userId));
            }
            eventService.record(id, "COMPLIANCE_VIOLATION_ACKNOWLEDGED", userId,
                Map.of("bulk", "true", "ruleId", safe(v.getRuleId())));
            acknowledged++;
        }
        return Map.of("acknowledged", acknowledged, "requested", ids.size());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private ComplianceViolation load(String id) {
        return violations.findById(id).orElseThrow(() -> ApiException.notFound("Compliance violation", id));
    }

    /** Verify the caller may act on this violation's workspace; returns the caller id. */
    private String mutator(String id) {
        String userId = authenticatedUser.id();
        ComplianceViolation v = load(id);
        rbac.require(userId, v.getWorkspaceId(), "manage_compliance");
        return userId;
    }

    private String safe(String s) { return s == null ? "" : s; }
}
