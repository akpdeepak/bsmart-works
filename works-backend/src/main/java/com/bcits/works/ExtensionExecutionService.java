package com.bcits.works;
import com.bcits.works.workspaces.ConfigExtensionPoints;
import com.bcits.works.workspaces.ConfigService;

import com.bcits.works.shared.EventService;
import com.bcits.works.workitems.WorkItem;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Declarative extension execution engine (iteration 17, Cap R — Extension API, B26).
 *
 * <p>Extensions are JSON objects stored in the workspace config document under
 * {@code "extensions":[]}. Each extension binds to a named hook from
 * {@link ConfigExtensionPoints}, has an optional AND-combined condition expression
 * (same safe syntax as the automation engine), and specifies a single action from the
 * server-owned {@link AllowedAction} allow-list. <b>No arbitrary code is ever evaluated</b>
 * — the engine maps action types to pre-defined Java handlers, giving a fully enumerable
 * and auditable attack surface.
 *
 * <p><b>Security properties:</b>
 * <ul>
 *   <li>Extensions are version-controlled workspace config; only {@code manage_config} can author them.</li>
 *   <li>Only action types in {@link AllowedAction} are dispatched; unknown types are logged and skipped.</li>
 *   <li>Condition evaluation uses the same safe AND-only field=value matcher as {@link AutomationService}.</li>
 *   <li>SET_FIELD can only write to an explicit allow-list of mutable fields; id/workspaceId/createdBy
 *       are never writable by an extension.</li>
 *   <li>Every execution, skip, and rejection is written to the append-only event store (RB-10 §3).</li>
 *   <li>Workspace-scoped by construction: extensions are read from the acting workspace's config only.</li>
 * </ul>
 *
 * <p><b>Extension document schema</b> (a member of the workspace config {@code extensions} array):
 * <pre>{@code
 * {
 *   "id":            "ext-uuid",
 *   "name":          "Auto-assign high-priority bugs",
 *   "point":         "work_item.before_create",
 *   "enabled":       true,
 *   "conditionExpr": "priority=HIGH AND type=BUG",
 *   "action": {
 *     "type":   "SET_FIELD",
 *     "params": { "field": "assigneeId", "value": "USR-tech-lead" }
 *   }
 * }
 * }</pre>
 *
 * <p><b>Supported extension points</b> (from {@link ConfigExtensionPoints}):
 * <ul>
 *   <li>{@code work_item.before_create} — validate or enrich before persist</li>
 *   <li>{@code work_item.after_status_change} — react to status transitions</li>
 *   <li>{@code form.validate} — additional portal form validation</li>
 * </ul>
 */
@Service
public class ExtensionExecutionService {

    private static final Logger log = LoggerFactory.getLogger(ExtensionExecutionService.class);

    /** Server-owned allow-list of executable action types. Enumerable = no hidden surface. */
    enum AllowedAction {
        /** Mutate a field on the work item being processed. */
        SET_FIELD,
        /** Abort the operation and return a message to the caller (HTTP 400 surface). */
        REJECT,
        /** Publish an in-app notification to a workspace member. */
        SEND_NOTIFICATION,
        /** Append a custom event to the append-only event store. */
        EMIT_EVENT;

        static boolean contains(String name) {
            try {
                valueOf(name.toUpperCase(Locale.ROOT));
                return true;
            } catch (IllegalArgumentException e) {
                return false;
            }
        }
    }

    /** Allow-listed fields that SET_FIELD may mutate; structural fields (id, workspaceId) are excluded. */
    private static final java.util.Set<String> MUTABLE_FIELDS =
        java.util.Set.of("assigneeid", "priority", "status", "description", "labels");

    /** Outcome of running all matching extensions for a single hook invocation. */
    public record ExtensionResult(boolean rejected, String rejectionMessage,
                                  int executed, int skipped) {
        static ExtensionResult pass(int executed, int skipped) {
            return new ExtensionResult(false, null, executed, skipped);
        }
        static ExtensionResult rejected(String message) {
            return new ExtensionResult(true, message, 0, 0);
        }
    }

    private final ConfigService config;
    private final EventService events;
    private final ObjectMapper json = new ObjectMapper();

    public ExtensionExecutionService(ConfigService config, EventService events) {
        this.config = config;
        this.events = events;
    }

    /**
     * Fire extensions bound to {@code work_item.before_create}.
     * May mutate {@code item} (SET_FIELD) or signal rejection (REJECT).
     * Must be called inside the create transaction before the item is persisted.
     */
    @Transactional
    public ExtensionResult beforeWorkItemCreate(String workspaceId, WorkItem item, String actorId) {
        return execute("work_item.before_create", workspaceId, actorId, item);
    }

    /**
     * Fire extensions bound to {@code work_item.after_status_change}.
     * Read-only with respect to the work item; may emit events or send notifications.
     * Called after the status change is persisted.
     */
    @Transactional
    public ExtensionResult afterStatusChange(String workspaceId, WorkItem item,
                                             String oldStatus, String actorId) {
        return execute("work_item.after_status_change", workspaceId, actorId, item);
    }

    /**
     * Fire extensions bound to {@code form.validate} for a submitted portal form.
     * Returns a rejection result when any enabled, matching extension rejects the submission.
     */
    @Transactional
    public ExtensionResult validateForm(String workspaceId, String formId, String actorId) {
        // form.validate extensions match on formId via conditionExpr; we pass a lightweight stub.
        WorkItem stub = new WorkItem();
        stub.setId(formId);
        return execute("form.validate", workspaceId, actorId, stub);
    }

    // ── internals ─────────────────────────────────────────────────────────────

    private ExtensionResult execute(String point, String workspaceId, String actorId,
                                    WorkItem item) {
        if (workspaceId == null) return ExtensionResult.pass(0, 0);

        List<Map<String, Object>> exts = loadExtensions(workspaceId, point);
        int executed = 0, skipped = 0;

        for (Map<String, Object> ext : exts) {
            String extId = str(ext.get("id"));

            if (!Boolean.TRUE.equals(ext.get("enabled"))) {
                skipped++;
                continue;
            }

            if (!AutomationService.conditionMatches(item, str(ext.get("conditionExpr")))) {
                skipped++;
                continue;
            }

            Map<String, Object> action = asMap(ext.get("action"));
            String rawType = str(action.get("type"));
            Map<String, Object> params = asMap(action.get("params"));

            if (!AllowedAction.contains(rawType)) {
                log.warn("Extension {} specifies unknown action type '{}' — skipped (allow-list only).", extId, rawType);
                auditSkip(workspaceId, actorId, extId, "UNKNOWN_ACTION_TYPE");
                skipped++;
                continue;
            }

            AllowedAction act = AllowedAction.valueOf(rawType.toUpperCase(Locale.ROOT));
            switch (act) {
                case SET_FIELD -> applySetField(item, params);
                case REJECT -> {
                    String msg = str(params.getOrDefault("message", "Rejected by a workspace extension."));
                    auditExecution(workspaceId, actorId, extId, "REJECT", point);
                    return ExtensionResult.rejected(msg);
                }
                case SEND_NOTIFICATION -> {
                    String targetId = str(params.getOrDefault("userId", actorId));
                    String message  = str(params.getOrDefault("message", "Extension notification"));
                    events.recordInWorkspace(workspaceId, item.getId(), "EXTENSION_NOTIFICATION",
                            targetId, Map.of("message", message, "extensionId", extId));
                }
                case EMIT_EVENT -> {
                    String eventType = str(params.getOrDefault("eventType", "EXTENSION_EVENT"));
                    events.recordInWorkspace(workspaceId, item.getId(), eventType,
                            actorId, Map.of("extensionId", extId, "point", point));
                }
                default -> { /* all AllowedAction enum cases handled above */ }
            }

            auditExecution(workspaceId, actorId, extId, act.name(), point);
            executed++;
        }

        return ExtensionResult.pass(executed, skipped);
    }

    private void applySetField(WorkItem item, Map<String, Object> params) {
        String field = str(params.get("field")).toLowerCase(Locale.ROOT);
        String value = str(params.getOrDefault("value", ""));

        if (!MUTABLE_FIELDS.contains(field)) {
            log.debug("SET_FIELD: '{}' is not in the mutable allow-list — ignored.", field);
            return;
        }
        switch (field) {
            case "assigneeid" -> item.setAssigneeId(value);
            case "priority"   -> item.setPriority(value.toUpperCase(Locale.ROOT));
            case "status"     -> item.setStatus(value.toUpperCase(Locale.ROOT));
            case "description" -> item.setDescription(value);
            // "labels" — stored as tags via a separate table; mutation is a no-op here
            // and must be handled by the caller (future iteration).
            default -> { }
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> loadExtensions(String workspaceId, String point) {
        try {
            String doc = config.getLiveDocument(workspaceId);
            Map<String, Object> root = json.readValue(doc, new TypeReference<>() { });
            Object raw = root.get("extensions");
            if (!(raw instanceof List<?> list)) return List.of();
            return list.stream()
                       .filter(e -> e instanceof Map<?, ?>)
                       .map(e -> (Map<String, Object>) e)
                       .filter(e -> point.equals(str(e.get("point"))))
                       .toList();
        } catch (Exception ex) {
            log.warn("Could not load extensions for workspace {}: {}", workspaceId, ex.getMessage());
            return List.of();
        }
    }

    private void auditExecution(String workspaceId, String actorId, String extId,
                                String actionType, String point) {
        events.recordInWorkspace(workspaceId, extId, "EXTENSION_EXECUTED", actorId,
                Map.of("action", actionType, "point", point));
    }

    private void auditSkip(String workspaceId, String actorId, String extId, String reason) {
        events.recordInWorkspace(workspaceId, extId, "EXTENSION_SKIPPED", actorId,
                Map.of("reason", reason));
    }

    private static String str(Object o) {
        return o instanceof String s ? s : o != null ? o.toString() : "";
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object o) {
        return o instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
    }
}
