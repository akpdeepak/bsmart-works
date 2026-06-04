package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Compliance rules (iteration 7, Cap K) — CRUD plus a test-before-activate dry-run that
 * previews how many work items a rule's scope BQL matches. Every operation is
 * workspace-scoped (RB-40 §1) and gated through {@link RbacService}; field logic lives in
 * {@link ComplianceRuleService} and BQL compilation in {@link BqlCompiler}.
 */
@RestController
@RequestMapping("/api/v1/compliance-rules")
public class ComplianceRuleController {

    private final ComplianceRuleRepository repo;
    private final ComplianceRuleService ruleService;
    private final BqlCompiler compiler;
    private final RbacService rbac;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;
    private final JdbcTemplate jdbc;

    public ComplianceRuleController(ComplianceRuleRepository repo,
                                    ComplianceRuleService ruleService,
                                    BqlCompiler compiler,
                                    RbacService rbac,
                                    EventService eventService,
                                    AuthenticatedUser authenticatedUser,
                                    JdbcTemplate jdbc) {
        this.repo = repo;
        this.ruleService = ruleService;
        this.compiler = compiler;
        this.rbac = rbac;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<ComplianceRule> list(@RequestParam(required = false) String projectId) {
        String userId = authenticatedUser.id();
        String workspaceId = projectId != null ? rbac.workspaceForProject(projectId) : workspaceForUser(userId);
        rbac.require(userId, workspaceId, "view_items");
        return projectId != null
            ? repo.findByWorkspaceIdAndProjectId(workspaceId, projectId)
            : repo.findByWorkspaceId(workspaceId);
    }

    @GetMapping("/{id}")
    public ComplianceRule get(@PathVariable String id) {
        ComplianceRule rule = repo.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), rule.getWorkspaceId(), "view_items");
        return rule;
    }

    @PostMapping
    public ComplianceRule create(@Valid @RequestBody ComplianceRule rule) {
        String userId = authenticatedUser.id();
        String workspaceId = rule.getProjectId() != null
            ? rbac.workspaceForProject(rule.getProjectId())
            : workspaceForUser(userId);
        rbac.require(userId, workspaceId, "manage_projects");
        ruleService.prepareNew(rule, userId);
        rule.setWorkspaceId(workspaceId);
        ComplianceRule saved = repo.save(rule);
        eventService.record(saved.getId(), "COMPLIANCE_RULE_CREATED", userId,
            Map.of("name", saved.getName(), "severity", saved.getSeverity()));
        return saved;
    }

    @PutMapping("/{id}")
    public ComplianceRule update(@PathVariable String id, @Valid @RequestBody ComplianceRule updated) {
        String userId = authenticatedUser.id();
        ComplianceRule existing = repo.findById(id).orElseThrow();
        rbac.require(userId, existing.getWorkspaceId(), "manage_projects");
        ruleService.applyUpdate(existing, updated);
        ComplianceRule saved = repo.save(existing);
        eventService.record(saved.getId(), "COMPLIANCE_RULE_UPDATED", userId,
            Map.of("name", saved.getName()));
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        ComplianceRule existing = repo.findById(id).orElseThrow();
        rbac.require(userId, existing.getWorkspaceId(), "manage_projects");
        repo.deleteById(id);
        eventService.record(id, "COMPLIANCE_RULE_DELETED", userId, Map.of());
        return ResponseEntity.noContent().build();
    }

    /**
     * Test-before-activate: preview how many in-scope work items the rule's scope BQL matches,
     * counted only within the rule's workspace (RB-40 §1 — the count cannot reach another
     * tenant's items). Read-only; never persists.
     */
    @PostMapping("/test")
    public Map<String, Object> test(@RequestBody ComplianceRule rule) {
        String userId = authenticatedUser.id();
        String workspaceId = rule.getProjectId() != null
            ? rbac.workspaceForProject(rule.getProjectId())
            : workspaceForUser(userId);
        rbac.require(userId, workspaceId, "view_items");

        Map<String, Object> result = new LinkedHashMap<>();
        try {
            BqlCompiler.Compiled scope =
                compiler.compile(rule.getScopeBql() == null ? "" : rule.getScopeBql(), userId);
            String sql = "SELECT count(*) FROM work_items "
                + "WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = ?) "
                + "AND deleted_at IS NULL"
                + (scope.sql().isEmpty() ? "" : " AND (" + scope.sql() + ")");
            List<Object> params = new ArrayList<>();
            params.add(workspaceId);
            params.addAll(scope.params());
            Long count = jdbc.queryForObject(sql, Long.class, params.toArray());
            result.put("valid", true);
            result.put("matchCount", count == null ? 0L : count);
        } catch (BqlException e) {
            result.put("valid", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    private String workspaceForUser(String userId) {
        try {
            return jdbc.queryForObject(
                "SELECT workspace_id FROM users WHERE id = ?", String.class, userId);
        } catch (Exception e) {
            return "WS-001";
        }
    }
}
