package com.bcits.works.security;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.BqlCompiler;
import com.bcits.works.shared.BqlException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
 * Compliance rules (iteration 7, Cap K). The visual rule builder's backend: workspace-scoped
 * CRUD, clone-from-template, test-before-activate (dry run), and activate/deactivate. RBAC lives
 * here in the service boundary, never the UI (RB-10 §2): reads require workspace membership;
 * mutations require {@code manage_compliance}. Field logic is delegated to
 * {@link ComplianceRuleService}; both scope and assertion BQL are validated before save so an
 * un-compilable rule can never be persisted. Every mutation is recorded as an event (RB-10 §3).
 */
@Tag(name = "Compliance Rules", description = "Workspace-scoped compliance rule CRUD, BQL validation, dry-run testing, and activate/deactivate lifecycle")
@RestController
@RequestMapping("/api/v1/compliance/rules")
public class ComplianceRuleController {

    private final ComplianceRuleRepository rules;
    private final ComplianceRuleService ruleService;
    private final ComplianceEvaluationService evaluation;
    private final BqlCompiler compiler;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;

    public ComplianceRuleController(ComplianceRuleRepository rules, ComplianceRuleService ruleService,
                                    ComplianceEvaluationService evaluation, BqlCompiler compiler,
                                    EventService eventService, AuthenticatedUser authenticatedUser,
                                    RbacGate rbac) {
        this.rules = rules;
        this.ruleService = ruleService;
        this.evaluation = evaluation;
        this.compiler = compiler;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @Operation(summary = "List compliance rules", description = "Returns all compliance rules for a workspace. Requires view_items. Filter by projectId to narrow scope.")
    @GetMapping
    public List<ComplianceRule> list(@RequestParam String workspaceId,
                                     @RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "view_items");
        return projectId != null
            ? rules.findByWorkspaceIdAndProjectId(workspaceId, projectId)
            : rules.findByWorkspaceIdOrderByUpdatedAtDesc(workspaceId);
    }

    @GetMapping("/templates")
    public List<ComplianceRule> templates() {
        return rules.findByIsTemplateTrueOrderByNameAsc();
    }

    @GetMapping("/{id}")
    public ComplianceRule get(@PathVariable String id) {
        ComplianceRule rule = load(id);
        requireMember(rule);
        return rule;
    }

    @Operation(summary = "Create compliance rule", description = "Creates and persists a new compliance rule. BQL expressions are validated before save. Requires manage_compliance.")
    @PostMapping
    public ComplianceRule create(@Valid @RequestBody ComplianceRule rule) {
        String userId = authenticatedUser.id();
        if (rule.getWorkspaceId() == null || rule.getWorkspaceId().isBlank()) {
            throw ApiException.badRequest("WORKSPACE_REQUIRED", "workspaceId is required.");
        }
        rbac.require(userId, rule.getWorkspaceId(), "manage_compliance");
        validateBql(rule);
        rule.setIsTemplate(false); // templates are seeded, not user-created via this path
        ComplianceRule saved = rules.save(ruleService.prepareNew(rule, userId));
        eventService.record(saved.getId(), "COMPLIANCE_RULE_CREATED", userId,
            Map.of("name", safe(saved.getName()), "workspaceId", safe(saved.getWorkspaceId())));
        return saved;
    }

    @PostMapping("/from-template/{templateId}")
    public ComplianceRule cloneTemplate(@PathVariable String templateId, @RequestParam String workspaceId,
                                        @RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        rbac.require(userId, workspaceId, "manage_compliance");
        ComplianceRule tpl = load(templateId);
        if (tpl.getIsTemplate() == null || !tpl.getIsTemplate()) {
            throw ApiException.badRequest("NOT_A_TEMPLATE", "Rule " + templateId + " is not a template.");
        }
        ComplianceRule copy = new ComplianceRule();
        copy.setWorkspaceId(workspaceId);
        copy.setProjectId(projectId);
        copy.setName(tpl.getName());
        copy.setDescription(tpl.getDescription());
        copy.setScopeBql(tpl.getScopeBql());
        copy.setAssertionBql(tpl.getAssertionBql());
        copy.setSeverity(tpl.getSeverity());
        copy.setNotifyTo(tpl.getNotifyTo());
        copy.setEvaluationMode(tpl.getEvaluationMode());
        ComplianceRule saved = rules.save(ruleService.prepareNew(copy, userId));
        eventService.record(saved.getId(), "COMPLIANCE_RULE_CREATED", userId,
            Map.of("name", safe(saved.getName()), "fromTemplate", templateId));
        return saved;
    }

    @PutMapping("/{id}")
    public ComplianceRule update(@PathVariable String id, @Valid @RequestBody ComplianceRule updated) {
        String userId = authenticatedUser.id();
        ComplianceRule existing = load(id);
        rbac.require(userId, existing.getWorkspaceId(), "manage_compliance");
        // Validate the post-update BQL using the incoming values where present.
        validateBql(updated.getScopeBql() != null ? updated.getScopeBql() : existing.getScopeBql(),
            updated.getAssertionBql() != null ? updated.getAssertionBql() : existing.getAssertionBql());
        ComplianceRule saved = rules.save(ruleService.applyUpdate(existing, updated));
        eventService.record(saved.getId(), "COMPLIANCE_RULE_UPDATED", userId,
            Map.of("name", safe(saved.getName())));
        return saved;
    }

    @PostMapping("/{id}/activate")
    public ComplianceRule activate(@PathVariable String id) {
        return setActive(id, true, "COMPLIANCE_RULE_ACTIVATED");
    }

    @PostMapping("/{id}/deactivate")
    public ComplianceRule deactivate(@PathVariable String id) {
        return setActive(id, false, "COMPLIANCE_RULE_DEACTIVATED");
    }

    /** Test-before-activate: report how many items the rule would flag now, without persisting. */
    @Operation(summary = "Dry-run a compliance rule", description = "Reports how many items the rule would flag without persisting any violation records. Useful before activation.")
    @PostMapping("/{id}/test")
    public Map<String, Object> test(@PathVariable String id) {
        String userId = authenticatedUser.id();
        ComplianceRule rule = load(id);
        rbac.require(userId, rule.getWorkspaceId(), "manage_compliance");
        return evaluation.dryRun(rule);
    }

    /** Evaluate an active rule on demand (the scheduler does this continuously/periodically). */
    @PostMapping("/{id}/evaluate")
    public Map<String, Object> evaluate(@PathVariable String id) {
        String userId = authenticatedUser.id();
        ComplianceRule rule = load(id);
        rbac.require(userId, rule.getWorkspaceId(), "manage_compliance");
        if (rule.getActive() == null || !rule.getActive()) {
            throw ApiException.badRequest("RULE_INACTIVE", "Activate the rule before evaluating it.");
        }
        ComplianceEvaluationService.EvaluationResult r = evaluation.evaluateRule(rule);
        return Map.of("failing", r.failing(), "opened", r.opened(), "resolved", r.resolved());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        ComplianceRule rule = load(id);
        rbac.require(userId, rule.getWorkspaceId(), "manage_compliance");
        rules.deleteById(id);
        eventService.record(id, "COMPLIANCE_RULE_DELETED", userId, Map.of("name", safe(rule.getName())));
        return ResponseEntity.noContent().build();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private ComplianceRule setActive(String id, boolean active, String eventType) {
        String userId = authenticatedUser.id();
        ComplianceRule rule = load(id);
        rbac.require(userId, rule.getWorkspaceId(), "manage_compliance");
        if (active) {
            validateBql(rule); // never activate a rule that cannot compile
        }
        rule.setActive(active);
        ComplianceRule saved = rules.save(rule);
        eventService.record(id, eventType, userId, Map.of("name", safe(rule.getName())));
        return saved;
    }

    private ComplianceRule load(String id) {
        return rules.findById(id).orElseThrow(() -> ApiException.notFound("Compliance rule", id));
    }

    private void requireMember(ComplianceRule rule) {
        // Templates are global (no workspace); everything else is tenant-scoped.
        if (rule.getWorkspaceId() != null) {
            rbac.require(authenticatedUser.id(), rule.getWorkspaceId(), "view_items");
        }
    }

    private void validateBql(ComplianceRule rule) {
        validateBql(rule.getScopeBql(), rule.getAssertionBql());
    }

    private void validateBql(String scopeBql, String assertionBql) {
        if (assertionBql == null || assertionBql.isBlank()) {
            throw ApiException.badRequest("ASSERTION_REQUIRED", "A rule must define an assertion.");
        }
        try {
            compiler.compile(scopeBql == null ? "" : scopeBql, "validate");
            compiler.compile(assertionBql, "validate");
        } catch (BqlException e) {
            throw ApiException.badRequest("INVALID_BQL", "Invalid BQL: " + e.getMessage());
        }
    }

    private String safe(String s) { return s == null ? "" : s; }
}
