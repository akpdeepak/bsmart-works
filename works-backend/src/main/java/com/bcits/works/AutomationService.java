package com.bcits.works;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The automation engine (iteration 13, Cap C): evaluate "When [trigger], if [condition], then
 * [action(s)]". Rules are workspace-scoped (RB-40 §1) and start disabled (test-before-activate);
 * test-mode previews the affected items without mutating anything; every run — real or dry — is
 * recorded in the append-only audit log (RB-20 §5). The condition matcher is a safe field predicate
 * (no SQL, no code) and is pure + static so it is unit-testable (RB-10 §7). The AI rule-suggestion
 * surface routes through the one control plane and falls back to the template library (RB-40 §2).
 */
@Service
public class AutomationService {

    private final AutomationRuleRepository rules;
    private final AutomationRunRepository runs;
    private final WorkItemRepository workItems;
    private final ProjectRepository projects;
    private final CommentRepository comments;
    private final EventService events;
    private final WebhookService webhooks;
    private final AiControlPlaneService controlPlane;
    private final JdbcTemplate jdbc;
    private final BqlCompiler bqlCompiler;
    private final ObjectMapper json = new ObjectMapper();

    public AutomationService(AutomationRuleRepository rules, AutomationRunRepository runs,
                             WorkItemRepository workItems, ProjectRepository projects,
                             CommentRepository comments, EventService events,
                             WebhookService webhooks, AiControlPlaneService controlPlane,
                             JdbcTemplate jdbc, BqlCompiler bqlCompiler) {
        this.rules = rules;
        this.runs = runs;
        this.workItems = workItems;
        this.projects = projects;
        this.comments = comments;
        this.events = events;
        this.webhooks = webhooks;
        this.controlPlane = controlPlane;
        this.jdbc = jdbc;
        this.bqlCompiler = bqlCompiler;
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────────

    public List<AutomationRule> list(String workspaceId) {
        return rules.findByWorkspaceIdOrderByUpdatedAtDesc(workspaceId);
    }

    public AutomationRule require(String workspaceId, String ruleId) {
        AutomationRule r = rules.findById(ruleId).orElseThrow(() -> ApiException.notFound("Automation rule", ruleId));
        if (!workspaceId.equals(r.getWorkspaceId())) {
            throw ApiException.forbidden("Automation rule belongs to a different workspace.");
        }
        return r;
    }

    @Transactional
    public AutomationRule create(String workspaceId, String creatorId, AutomationRule rule) {
        return rules.save(prepareNew(workspaceId, creatorId, rule));
    }

    /** Stamp a new rule: id, normalized trigger/actions, disabled (test-before-activate), timestamps. */
    AutomationRule prepareNew(String workspaceId, String creatorId, AutomationRule rule) {
        rule.setId("AUTO-" + shortId());
        rule.setWorkspaceId(workspaceId);
        rule.setTriggerType(normalizeTrigger(rule.getTriggerType()));
        rule.setConditionExpr(rule.getConditionExpr() == null ? "" : rule.getConditionExpr().trim());
        rule.setActions(normalizeActions(rule.getActions()));
        rule.setTriggerConfig(rule.getTriggerConfig() == null || rule.getTriggerConfig().isBlank()
            ? "{}" : rule.getTriggerConfig());
        rule.setEnabled(false);
        rule.setRunCount(0);
        rule.setCreatedBy(creatorId);
        OffsetDateTime now = OffsetDateTime.now();
        rule.setCreatedAt(now);
        rule.setUpdatedAt(now);
        return rule;
    }

    @Transactional
    public AutomationRule update(String workspaceId, String ruleId, AutomationRule updated) {
        AutomationRule existing = require(workspaceId, ruleId);
        return rules.save(applyUpdate(existing, updated));
    }

    AutomationRule applyUpdate(AutomationRule existing, AutomationRule updated) {
        if (updated.getName() != null) {
            existing.setName(updated.getName());
        }
        existing.setDescription(updated.getDescription());
        if (updated.getTriggerType() != null) {
            existing.setTriggerType(normalizeTrigger(updated.getTriggerType()));
        }
        if (updated.getConditionExpr() != null) {
            existing.setConditionExpr(updated.getConditionExpr().trim());
        }
        if (updated.getActions() != null) {
            existing.setActions(normalizeActions(updated.getActions()));
        }
        if (updated.getTriggerConfig() != null) {
            existing.setTriggerConfig(updated.getTriggerConfig());
        }
        if (updated.getScheduleCron() != null) {
            existing.setScheduleCron(updated.getScheduleCron());
        }
        existing.setUpdatedAt(OffsetDateTime.now());
        return existing;
    }

    @Transactional
    public AutomationRule setEnabled(String workspaceId, String ruleId, boolean enabled) {
        AutomationRule r = require(workspaceId, ruleId);
        r.setEnabled(enabled);
        r.setUpdatedAt(OffsetDateTime.now());
        return rules.save(r);
    }

    @Transactional
    public void delete(String workspaceId, String ruleId) {
        rules.delete(require(workspaceId, ruleId));
    }

    // ── Test mode (dry-run preview — no mutation) ────────────────────────────────

    public record Preview(String ruleId, int affected, List<String> sample, boolean dryRun) { }

    @Transactional
    public Preview test(String workspaceId, String ruleId) {
        AutomationRule rule = require(workspaceId, ruleId);
        List<WorkItem> matches = scopedItems(workspaceId).stream()
            .filter(w -> conditionMatchesBql(w, rule.getConditionExpr()))
            .collect(Collectors.toList());
        List<String> sample = matches.stream().map(WorkItem::getId).limit(20).collect(Collectors.toList());
        recordRun(workspaceId, ruleId, "DRY_RUN", "Test mode preview", matches.size(), true, null);
        return new Preview(ruleId, matches.size(), sample, true);
    }

    // ── Real execution (manual run / scheduled run) ──────────────────────────────

    @Transactional
    public Preview runNow(String workspaceId, String ruleId, String actorId) {
        AutomationRule rule = require(workspaceId, ruleId);
        List<WorkItem> matches = scopedItems(workspaceId).stream()
            .filter(w -> conditionMatchesBql(w, rule.getConditionExpr()))
            .collect(Collectors.toList());
        for (WorkItem item : matches) {
            executeActions(workspaceId, item, rule, actorId);
        }
        rule.setRunCount((rule.getRunCount() == null ? 0 : rule.getRunCount()) + 1);
        rule.setLastRunAt(OffsetDateTime.now());
        rules.save(rule);
        recordRun(workspaceId, ruleId, matches.isEmpty() ? "NOOP" : "SUCCESS",
            "Manual run", matches.size(), false, null);
        return new Preview(ruleId, matches.size(), matches.stream().map(WorkItem::getId).limit(20).toList(), false);
    }

    /** Engine hook: evaluate all enabled rules for a trigger against the triggering item. */
    @Transactional
    public int evaluateForItem(String workspaceId, String triggerType, WorkItem item, String actorId) {
        List<AutomationRule> matching = rules.findByWorkspaceIdAndEnabledTrueAndTriggerType(
            workspaceId, normalizeTrigger(triggerType));
        int fired = 0;
        for (AutomationRule rule : matching) {
            if (conditionMatchesBql(item, rule.getConditionExpr())) {
                executeActions(workspaceId, item, rule, actorId);
                rule.setRunCount((rule.getRunCount() == null ? 0 : rule.getRunCount()) + 1);
                rule.setLastRunAt(OffsetDateTime.now());
                rules.save(rule);
                recordRun(workspaceId, rule.getId(), "SUCCESS",
                    triggerType + " on " + item.getId(), 1, false, null);
                fired++;
            }
        }
        return fired;
    }

    private void executeActions(String workspaceId, WorkItem item, AutomationRule rule, String actorId) {
        for (Map<String, Object> action : parseActions(rule.getActions())) {
            String type = str(action.get("type")).toUpperCase(Locale.ROOT);
            Map<String, Object> params = asMap(action.get("params"));
            switch (type) {
                case AutomationCatalog.AC_SET_STATUS -> {
                    String old = item.getStatus();
                    item.setStatus(str(params.getOrDefault("status", item.getStatus())));
                    workItems.save(item);
                    events.recordDiff(item.getId(), "STATUS_CHANGED", actorId, "status", old, item.getStatus());
                }
                case AutomationCatalog.AC_SET_PRIORITY -> {
                    item.setPriority(str(params.getOrDefault("priority", item.getPriority())));
                    workItems.save(item);
                    events.record(item.getId(), "PRIORITY_CHANGED", actorId, Map.of("via", "automation"));
                }
                case AutomationCatalog.AC_ASSIGN -> {
                    item.setAssigneeId(str(params.get("assigneeId")));
                    workItems.save(item);
                    events.recordDiff(item.getId(), "ASSIGNED", actorId, "assignee", null, item.getAssigneeId());
                }
                case AutomationCatalog.AC_ADD_COMMENT -> {
                    Comment c = new Comment();
                    c.setWorkItemId(item.getId());
                    c.setAuthorId(actorId);
                    c.setBody(str(params.getOrDefault("body", "Automated update.")));
                    c.setCreatedAt(OffsetDateTime.now());
                    comments.save(c);
                    events.record(item.getId(), "COMMENT_ADDED", actorId, Map.of("via", "automation"));
                }
                case AutomationCatalog.AC_NOTIFY ->
                    events.record(item.getId(), "AUTOMATION_NOTIFY", actorId,
                        Map.of("ruleId", rule.getId(), "message", str(params.getOrDefault("message", ""))));
                case AutomationCatalog.AC_POST_WEBHOOK ->
                    webhooks.enqueue(workspaceId, "automation." + rule.getId(),
                        Map.of("ruleId", rule.getId(), "workItemId", item.getId()));
                default -> { /* unknown action types are dropped at normalize time */ }
            }
        }
    }

    // ── AI-suggested rules (RB-40 §2; deterministic fallback = templates) ─────────

    public Map<String, Object> suggest(String workspaceId, String userId, boolean inContext) {
        List<Map<String, Object>> suggestions = new ArrayList<>();
        List<WorkItem> scoped = scopedItems(workspaceId);
        long unassignedHigh = scoped.stream()
            .filter(w -> "High".equalsIgnoreCase(str(w.getPriority())) || "Critical".equalsIgnoreCase(str(w.getPriority())))
            .filter(w -> w.getAssigneeId() == null).count();
        if (unassignedHigh > 0) {
            suggestions.add(Map.of("name", "Notify on unassigned high-priority items",
                "triggerType", AutomationCatalog.TR_ITEM_CREATED, "conditionExpr", "priority = High",
                "rationale", unassignedHigh + " high/critical items are currently unassigned."));
        }
        AutomationCatalog.templates().forEach(t -> suggestions.add(Map.of(
            "name", t.name(), "triggerType", t.triggerType(), "conditionExpr", t.conditionExpr(),
            "rationale", "Template from the automation library.")));
        String draft = suggestions.size() + " automation suggestions from current workspace patterns.";
        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.AUTOMATION_SUGGEST, "Suggest automations", draft, null, inContext));
        return Map.of("suggestions", suggestions, "usedAi", out.usedAi(), "fallback", out.fallback(),
            "policyState", out.policyState());
    }

    public org.springframework.data.domain.Page<AutomationRun> runLog(
            String workspaceId, org.springframework.data.domain.Pageable pageable) {
        return runs.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId, pageable);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  Pure helpers — unit-testable in isolation (RB-10 §7)
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * Evaluate a safe field-predicate condition against a work item. Empty condition matches all.
     * Evaluates an automation condition by compiling it through the unified BQL layer (RB-10 §6)
     * and executing a workspace-scoped COUNT(*) against the database. Falls back to the legacy
     * in-memory matcher if BQL compilation or query execution fails.
     */
    boolean conditionMatchesBql(WorkItem item, String expr) {
        if (expr == null || expr.isBlank()) return true;
        try {
            BqlCompiler.Compiled c = bqlCompiler.compile(expr, null);
            if (c.sql().isBlank()) return true;
            String sql = "SELECT COUNT(*) FROM work_items WHERE id = ? AND deleted_at IS NULL AND (" + c.sql() + ")";
            List<Object> params = new ArrayList<>();
            params.add(item.getId());
            params.addAll(c.params());
            Long count = jdbc.queryForObject(sql, Long.class, params.toArray());
            return count != null && count > 0;
        } catch (Exception e) {
            return conditionMatches(item, expr);
        }
    }

    /**
     * Clauses are AND-combined, each {@code field op value} with op {@code =} or {@code !=}. Supported
     * fields: priority, type, status, assignee/assigneeId. String comparison is case-insensitive.
     *
     * <p>This is the legacy fallback. Production callers use {@link #conditionMatchesBql} which
     * compiles through the unified BQL layer (RB-10 §6).
     */
    static boolean conditionMatches(WorkItem item, String expr) {
        if (expr == null || expr.isBlank()) {
            return true;
        }
        for (String clause : expr.split("(?i)\\bAND\\b")) {
            String c = clause.trim();
            if (c.isEmpty()) {
                continue;
            }
            boolean negate = c.contains("!=");
            String[] parts = c.split("!=|=", 2);
            if (parts.length != 2) {
                return false;
            }
            String field = parts[0].trim().toLowerCase(Locale.ROOT);
            String expected = unquote(parts[1].trim());
            String actual = fieldValue(item, field);
            boolean equal = actual != null && actual.equalsIgnoreCase(expected);
            if (negate ? equal : !equal) {
                return false;
            }
        }
        return true;
    }

    private static String fieldValue(WorkItem item, String field) {
        return switch (field) {
            case "priority" -> item.getPriority();
            case "type" -> item.getType();
            case "status" -> item.getStatus();
            case "assignee", "assigneeid" -> item.getAssigneeId();
            default -> null;
        };
    }

    static String normalizeTrigger(String triggerType) {
        return AutomationCatalog.isTrigger(triggerType)
            ? triggerType.trim().toUpperCase(Locale.ROOT) : AutomationCatalog.TR_ITEM_CREATED;
    }

    /** Drop any unknown action types so only catalog actions are ever stored / executed. */
    String normalizeActions(String actionsJson) {
        List<Map<String, Object>> parsed = parseActions(actionsJson);
        List<Map<String, Object>> clean = parsed.stream()
            .filter(a -> AutomationCatalog.isAction(str(a.get("type"))))
            .map(a -> Map.<String, Object>of(
                "type", str(a.get("type")).toUpperCase(Locale.ROOT),
                "params", asMap(a.get("params"))))
            .collect(Collectors.toList());
        try {
            return json.writeValueAsString(clean);
        } catch (Exception e) {
            return "[]";
        }
    }

    List<Map<String, Object>> parseActions(String actionsJson) {
        if (actionsJson == null || actionsJson.isBlank()) {
            return List.of();
        }
        try {
            return json.readValue(actionsJson, new TypeReference<List<Map<String, Object>>>() { });
        } catch (Exception e) {
            return List.of();
        }
    }

    private void recordRun(String workspaceId, String ruleId, String status, String summary,
                           int affected, boolean dryRun, String error) {
        AutomationRun run = new AutomationRun();
        run.setId("ARUN-" + shortId());
        run.setWorkspaceId(workspaceId);
        run.setRuleId(ruleId);
        run.setStatus(status);
        run.setTriggerSummary(summary);
        run.setAffectedCount(affected);
        run.setDryRun(dryRun);
        run.setError(error);
        run.setCreatedAt(OffsetDateTime.now());
        runs.save(run);
    }

    private List<WorkItem> scopedItems(String workspaceId) {
        return projects.findByWorkspaceId(workspaceId).stream()
            .flatMap(p -> workItems.findByProjectId(p.getId()).stream())
            .collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object o) {
        return o instanceof Map ? (Map<String, Object>) o : Map.of();
    }

    private static String unquote(String s) {
        if (s.length() >= 2 && (s.startsWith("\"") && s.endsWith("\"") || s.startsWith("'") && s.endsWith("'"))) {
            return s.substring(1, s.length() - 1);
        }
        return s;
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private static String str(Object o) {
        return o == null ? "" : o.toString();
    }
}
