package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Evaluates a compliance rule (iteration 7, Cap K) and reconciles its violations.
 *
 * <p>A rule scopes work items via {@code scopeBql} and asserts the compliant condition via
 * {@code assertionBql}. Both compile to <b>parameterized</b> SQL through {@link BqlCompiler}
 * (RB-10 §6) — nothing the rule author typed is ever concatenated as SQL syntax. A scoped item
 * whose assertion is {@code IS NOT TRUE} (false <i>or</i> null) is in violation.
 *
 * <p>Every query is workspace-scoped (RB-40 §1): the candidate set is restricted to the rule's
 * workspace via the {@code projects} join, so a rule can never raise a violation against another
 * tenant's item. Reconciliation ({@link #reconcile}) is pure and unit-tested: newly-failing items
 * open OPEN violations and route notifications; items that have started passing auto-resolve.
 * Each transition is recorded as an event (RB-10 §3) so the compliance audit log is rebuildable.
 */
@Service
public class ComplianceEvaluationService {

    private static final Logger log = LoggerFactory.getLogger(ComplianceEvaluationService.class);
    private static final List<String> ACTIVE_STATUSES = List.of("OPEN", "ACKNOWLEDGED");

    private final JdbcTemplate jdbc;
    private final BqlCompiler compiler;
    private final ComplianceViolationRepository violations;
    private final EventService eventService;
    private final ComplianceNotificationService notifier;

    public ComplianceEvaluationService(JdbcTemplate jdbc, BqlCompiler compiler,
                                       ComplianceViolationRepository violations,
                                       EventService eventService, ComplianceNotificationService notifier) {
        this.jdbc = jdbc;
        this.compiler = compiler;
        this.violations = violations;
        this.eventService = eventService;
        this.notifier = notifier;
    }

    /** A scoped work item that currently fails a rule's assertion. */
    public record FailingItem(String id, String title, String projectId,
                              String assigneeId, String createdBy) { }

    /** Outcome of one rule evaluation, for logs and the "test" endpoint. */
    public record EvaluationResult(int failing, int opened, int resolved) { }

    /** Pure split of the current failing set against the existing active violations. */
    record Reconciliation(List<FailingItem> toOpen, List<ComplianceViolation> toResolve) { }

    /**
     * Evaluate one active rule and persist the reconciled violations.
     * Defensive: a malformed rule (bad BQL) is logged and skipped, never throwing into a caller
     * loop or a scheduled job. Returns the counts of what changed.
     */
    public EvaluationResult evaluateRule(ComplianceRule rule) {
        if (rule.getAssertionBql() == null || rule.getAssertionBql().isBlank()) {
            return new EvaluationResult(0, 0, 0);
        }
        List<FailingItem> failing;
        try {
            failing = findFailingItems(rule);
        } catch (RuntimeException ex) {
            log.warn("[COMPLIANCE] Rule {} could not be evaluated: {}", rule.getId(), ex.getMessage());
            return new EvaluationResult(0, 0, 0);
        }

        List<ComplianceViolation> active = violations.findByRuleIdAndStatusIn(rule.getId(), ACTIVE_STATUSES);
        Reconciliation r = reconcile(failing, active);

        for (FailingItem item : r.toOpen()) {
            open(rule, item);
        }
        for (ComplianceViolation v : r.toResolve()) {
            autoResolve(v);
        }
        jdbc.update("UPDATE compliance_rules SET last_evaluated_at = ? WHERE id = ?",
            OffsetDateTime.now(), rule.getId());
        return new EvaluationResult(failing.size(), r.toOpen().size(), r.toResolve().size());
    }

    /**
     * Dry run for test-before-activate: how many items the rule would flag right now, without
     * creating any violations. Returns the count plus a small sample of item ids/titles.
     */
    public Map<String, Object> dryRun(ComplianceRule rule) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (rule.getAssertionBql() == null || rule.getAssertionBql().isBlank()) {
            result.put("valid", false);
            result.put("error", "Rule has no assertion to test.");
            return result;
        }
        try {
            List<FailingItem> failing = findFailingItems(rule);
            result.put("valid", true);
            result.put("violations", failing.size());
            result.put("sample", failing.stream().limit(10)
                .map(f -> Map.of("id", f.id(), "title", f.title() == null ? "" : f.title()))
                .toList());
        } catch (RuntimeException ex) {
            result.put("valid", false);
            result.put("error", ex.getMessage());
        }
        return result;
    }

    /** Pure reconciliation: newly-failing items to open, no-longer-failing violations to resolve. */
    Reconciliation reconcile(List<FailingItem> failing, List<ComplianceViolation> active) {
        Set<String> activeItemIds = active.stream()
            .map(ComplianceViolation::getWorkItemId).collect(Collectors.toSet());
        Set<String> failingIds = failing.stream()
            .map(FailingItem::id).collect(Collectors.toSet());
        List<FailingItem> toOpen = failing.stream()
            .filter(f -> !activeItemIds.contains(f.id())).toList();
        List<ComplianceViolation> toResolve = active.stream()
            .filter(v -> !failingIds.contains(v.getWorkItemId())).toList();
        return new Reconciliation(toOpen, toResolve);
    }

    /** Run the rule's scope+assertion as one workspace-scoped, parameterized query. */
    List<FailingItem> findFailingItems(ComplianceRule rule) {
        StringBuilder sql = new StringBuilder(
            "SELECT id, title, project_id, assignee_id, created_by FROM work_items "
            + "WHERE deleted_at IS NULL "
            + "AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)");
        List<Object> params = new ArrayList<>();
        params.add(rule.getWorkspaceId());

        if (rule.getProjectId() != null && !rule.getProjectId().isBlank()) {
            sql.append(" AND project_id = ?");
            params.add(rule.getProjectId());
        }

        String currentUserId = rule.getCreatedBy() == null ? "system" : rule.getCreatedBy();
        BqlCompiler.Compiled scope = compiler.compile(rule.getScopeBql(), currentUserId);
        if (!scope.sql().isEmpty()) {
            sql.append(" AND (").append(scope.sql()).append(")");
            params.addAll(scope.params());
        }

        BqlCompiler.Compiled assertion = compiler.compile(rule.getAssertionBql(), currentUserId);
        if (assertion.sql().isEmpty()) {
            return List.of(); // nothing asserted ⇒ nothing can fail
        }
        // A scoped item violates the rule when the assertion is false OR null (missing field).
        sql.append(" AND (").append(assertion.sql()).append(") IS NOT TRUE");
        params.addAll(assertion.params());
        sql.append(" ORDER BY id LIMIT 1000");

        return jdbc.query(sql.toString(), (rs, n) -> new FailingItem(
            rs.getString("id"), rs.getString("title"), rs.getString("project_id"),
            rs.getString("assignee_id"), rs.getString("created_by")), params.toArray());
    }

    private void open(ComplianceRule rule, FailingItem item) {
        ComplianceViolation v = new ComplianceViolation();
        v.setId("CV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        v.setRuleId(rule.getId());
        v.setWorkspaceId(rule.getWorkspaceId());
        v.setProjectId(item.projectId());
        v.setWorkItemId(item.id());
        v.setWorkItemTitle(item.title());
        v.setSeverity(rule.getSeverity());
        v.setStatus("OPEN");
        OffsetDateTime now = OffsetDateTime.now();
        v.setDetectedAt(now);
        v.setUpdatedAt(now);
        v.setEscalated(false);
        ComplianceViolation saved = violations.save(v);

        eventService.record(saved.getId(), "COMPLIANCE_VIOLATION_OPENED", "system", Map.of(
            "ruleId", rule.getId(), "ruleName", rule.getName() == null ? "" : rule.getName(),
            "workItemId", item.id(), "severity", rule.getSeverity()));
        notifier.routeViolation(rule, saved, item);
    }

    private void autoResolve(ComplianceViolation v) {
        v.setStatus("RESOLVED");
        v.setResolution("AUTO_RESOLVED");
        OffsetDateTime now = OffsetDateTime.now();
        v.setResolvedAt(now);
        v.setUpdatedAt(now);
        violations.save(v);
        eventService.record(v.getId(), "COMPLIANCE_VIOLATION_AUTO_RESOLVED", "system", Map.of(
            "ruleId", v.getRuleId(), "workItemId", v.getWorkItemId()));
    }
}
