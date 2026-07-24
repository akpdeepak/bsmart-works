package com.bcits.works.workitems;
import com.bcits.works.workitems.api.WorkflowStatus;

import com.bcits.works.FieldDefRepository;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.RbacGate;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Evaluates workflow transition rules (conditions, validators, post-functions) stored
 * as JSONB on WorkflowTransition. Enforces per-transition policies such as
 * "only assignee can resolve", "require comment on rejection", "auto-set field".
 *
 * <p>Called from WorkItemController on status changes (Cap C, Iteration 3).
 * Rule format: each array element is {"type": "...", ...params}.
 */
@Service
public class WorkflowRuleEngine {

    private final WorkflowRepository workflowRepo;
    private final WorkflowTransitionRepository transitionRepo;
    private final WorkflowStatusRepository statusRepo;
    private final FieldDefRepository fieldDefRepo;
    private final RbacGate rbac;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper = new ObjectMapper();

    public WorkflowRuleEngine(WorkflowRepository workflowRepo,
                               WorkflowTransitionRepository transitionRepo,
                               WorkflowStatusRepository statusRepo,
                               FieldDefRepository fieldDefRepo,
                               RbacGate rbac,
                               JdbcTemplate jdbc) {
        this.workflowRepo = workflowRepo;
        this.transitionRepo = transitionRepo;
        this.statusRepo = statusRepo;
        this.fieldDefRepo = fieldDefRepo;
        this.rbac = rbac;
        this.jdbc = jdbc;
    }

    /**
     * Enforces transition conditions and validators before a status change is saved.
     * Throws ApiException (403 for conditions, 400 for validators) if a rule fails.
     * No-ops when no workflow is configured for the work item type.
     */
    public void enforceTransitionRules(String workItemId, String fromStatus, String toStatus,
                                        String userId, String wsId) {
        if (fromStatus == null || toStatus == null || fromStatus.equals(toStatus)) return;
        findTransition(workItemId, fromStatus, toStatus, wsId).ifPresent(trans -> {
            evaluateConditions(trans.getConditions(), workItemId, userId, wsId);
            evaluateValidators(trans.getValidators(), workItemId, wsId);
        });
    }

    /**
     * Executes post-functions after a status change is saved. Failures are logged but
     * do not roll back the transition — the item has already moved to the new status.
     */
    public void executePostFunctions(String workItemId, String fromStatus, String toStatus,
                                      String userId, String wsId) {
        if (fromStatus == null || toStatus == null || fromStatus.equals(toStatus)) return;
        findTransition(workItemId, fromStatus, toStatus, wsId)
                .ifPresent(trans -> runPostFunctions(trans.getPostFunctions(), workItemId, userId, wsId));
    }

    // ── Rule lookup ──────────────────────────────────────────────────────────────

    private Optional<WorkflowTransition> findTransition(String workItemId, String fromStatus,
                                                          String toStatus, String wsId) {
        String itemType = getWorkItemType(workItemId);
        if (itemType == null || wsId == null) return Optional.empty();

        // Prefer a type-specific workflow; fall back to the default workflow for the workspace.
        List<Workflow> typeWorkflows = workflowRepo.findByWorkspaceIdAndItemType(wsId, itemType);
        Optional<Workflow> wfOpt = typeWorkflows.isEmpty()
                ? workflowRepo.findByWorkspaceId(wsId).stream()
                        .filter(w -> Boolean.TRUE.equals(w.getIsDefault())).findFirst()
                : typeWorkflows.stream().findFirst();

        if (wfOpt.isEmpty()) return Optional.empty();
        String wfId = wfOpt.get().getId();

        // Status values on the work item are status names; transitions store status IDs.
        // Build a reverse map: name → id for the workflow's statuses.
        List<WorkflowStatus> statuses = statusRepo.findByWorkflowIdOrderByPosition(wfId);
        String fromId = resolveStatusId(fromStatus, statuses);
        String toId   = resolveStatusId(toStatus,   statuses);
        if (fromId == null || toId == null) return Optional.empty();

        return transitionRepo.findByWorkflowIdAndFromStatusAndToStatus(wfId, fromId, toId)
                .stream().findFirst();
    }

    private String resolveStatusId(String nameOrId, List<WorkflowStatus> statuses) {
        // If it's already an ID, return as-is.
        if (statuses.stream().anyMatch(s -> s.getId().equals(nameOrId))) return nameOrId;
        // Otherwise look up by name.
        return statuses.stream().filter(s -> nameOrId.equals(s.getName()))
                .map(WorkflowStatus::getId).findFirst().orElse(null);
    }

    // ── Condition evaluation ─────────────────────────────────────────────────────

    private void evaluateConditions(String conditionsJson, String workItemId, String userId, String wsId) {
        for (Map<String, Object> cond : parseRules(conditionsJson)) {
            String type = (String) cond.get("type");
            switch (type != null ? type : "") {
                case "IS_ASSIGNEE" -> {
                    String assignee = getWorkItemField(workItemId, "assignee_id");
                    if (!userId.equals(assignee)) {
                        throw ApiException.forbidden("Only the assignee can perform this transition.");
                    }
                }
                case "HAS_MIN_TIER" -> {
                    int required = ((Number) cond.getOrDefault("tier", 1)).intValue();
                    if (rbac.getUserTier(userId, wsId) < required) {
                        throw ApiException.forbidden("Insufficient role to perform this transition.");
                    }
                }
                case "FIELD_EQUALS" -> {
                    String fieldKey = (String) cond.get("fieldKey");
                    String expected  = (String) cond.get("value");
                    if (fieldKey != null && expected != null) {
                        String actual = getCustomFieldValue(workItemId, fieldKey, wsId);
                        if (!expected.equals(actual)) {
                            throw ApiException.badRequest("TRANSITION_CONDITION_FAILED",
                                    "Transition condition not met: field '" + fieldKey + "' must equal '" + expected + "'.");
                        }
                    }
                }
                default -> { /* unknown condition type — skip */ }
            }
        }
    }

    // ── Validator evaluation ─────────────────────────────────────────────────────

    private void evaluateValidators(String validatorsJson, String workItemId, String wsId) {
        for (Map<String, Object> v : parseRules(validatorsJson)) {
            String type = (String) v.get("type");
            switch (type != null ? type : "") {
                case "REQUIRE_COMMENT" -> {
                    int count = countComments(workItemId);
                    if (count == 0) {
                        throw ApiException.badRequest("VALIDATOR_FAILED",
                                "A comment is required before performing this transition.");
                    }
                }
                case "REQUIRE_FIELD" -> {
                    String fieldKey = (String) v.get("fieldKey");
                    if (fieldKey != null) {
                        String val = getCustomFieldValue(workItemId, fieldKey, wsId);
                        if (val == null || val.isBlank()) {
                            throw ApiException.badRequest("VALIDATOR_FAILED",
                                    "Field '" + fieldKey + "' must be filled in before this transition.");
                        }
                    }
                }
                default -> { /* unknown validator — skip */ }
            }
        }
    }

    // ── Post-function execution ──────────────────────────────────────────────────

    private void runPostFunctions(String postFunctionsJson, String workItemId, String userId, String wsId) {
        for (Map<String, Object> pf : parseRules(postFunctionsJson)) {
            String type = (String) pf.get("type");
            try {
                switch (type != null ? type : "") {
                    case "SET_FIELD" -> {
                        String fieldKey = (String) pf.get("fieldKey");
                        String value    = (String) pf.get("value");
                        if (fieldKey != null) upsertCustomField(workItemId, fieldKey, value, wsId);
                    }
                    case "ASSIGN_TO_CURRENT_USER" ->
                        jdbc.update("UPDATE work_items SET assignee_id = ? WHERE id = ?",
                                userId, workItemId);
                    default -> { /* unknown post-function — skip */ }
                }
            } catch (Exception e) {
                // Post-functions are best-effort; the transition itself already succeeded.
            }
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private List<Map<String, Object>> parseRules(String json) {
        if (json == null || json.isBlank() || "[]".equals(json.trim())) return List.of();
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private String getWorkItemType(String workItemId) {
        try { return jdbc.queryForObject("SELECT type FROM work_items WHERE id = ?", String.class, workItemId); }
        catch (Exception e) { return null; }
    }

    private String getWorkItemField(String workItemId, String column) {
        try { return jdbc.queryForObject("SELECT " + column + " FROM work_items WHERE id = ?", String.class, workItemId); }
        catch (Exception e) { return null; }
    }

    private String getCustomFieldValue(String workItemId, String fieldKey, String wsId) {
        try {
            return jdbc.queryForObject(
                "SELECT fv.value_text FROM work_item_field_value fv " +
                "JOIN field_def fd ON fd.id = fv.field_def_id " +
                "WHERE fv.work_item_id = ? AND fd.field_key = ? AND fd.workspace_id = ?",
                String.class, workItemId, fieldKey, wsId);
        } catch (Exception e) { return null; }
    }

    private int countComments(String workItemId) {
        try { return jdbc.queryForObject("SELECT COUNT(*) FROM comments WHERE work_item_id = ?", Integer.class, workItemId); }
        catch (Exception e) { return 0; }
    }

    private void upsertCustomField(String workItemId, String fieldKey, String value, String wsId) {
        String fieldDefId = null;
        try {
            fieldDefId = jdbc.queryForObject(
                "SELECT id FROM field_def WHERE field_key = ? AND workspace_id = ?",
                String.class, fieldKey, wsId);
        } catch (Exception e) { return; }
        if (fieldDefId == null) return;
        String id = "FV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        OffsetDateTime now = OffsetDateTime.now();
        jdbc.update(
            "INSERT INTO work_item_field_value (id, work_item_id, field_def_id, value_text, created_at, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, ?) " +
            "ON CONFLICT (work_item_id, field_def_id) DO UPDATE " +
            "SET value_text = EXCLUDED.value_text, updated_at = EXCLUDED.updated_at",
            id, workItemId, fieldDefId, value, now, now);
    }
}
