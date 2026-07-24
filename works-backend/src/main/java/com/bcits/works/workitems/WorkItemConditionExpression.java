package com.bcits.works.workitems;
import com.bcits.works.workitems.api.WorkItem;

import java.util.Locale;

/**
 * The legacy AND-combined condition-expression evaluator over a {@link WorkItem}.
 *
 * <p>Extracted from {@code AutomationService} (EPIC-03 Phase 2, GH-537) because two engines evaluate
 * the same expression grammar against the same entity: the automation rule engine and the workspace
 * extension engine ({@link ExtensionExecutionService}). While both sat in the flat root the shared
 * helper could stay package-private and the coupling was invisible; carving either one out made it a
 * compile error. The evaluator belongs with the entity it interrogates, so both engines depend on
 * {@code workitems} rather than on each other.
 *
 * <p>Clauses are AND-combined, each {@code field op value} with op {@code =} or {@code !=}. Supported
 * fields: priority, type, status, assignee/assigneeId. String comparison is case-insensitive.
 *
 * <p>This is the legacy fallback. Production automation callers use
 * {@code AutomationService.conditionMatchesBql}, which compiles through the unified BQL layer
 * (RB-10 §6). Pure function, no I/O.
 */
public final class WorkItemConditionExpression {

    private WorkItemConditionExpression() { }

    /** @return true when every AND-combined clause in {@code expr} holds for {@code item}. */
    public static boolean matches(WorkItem item, String expr) {
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

    private static String unquote(String s) {
        if (s.length() >= 2 && (s.startsWith("\"") && s.endsWith("\"") || s.startsWith("'") && s.endsWith("'"))) {
            return s.substring(1, s.length() - 1);
        }
        return s;
    }
}
