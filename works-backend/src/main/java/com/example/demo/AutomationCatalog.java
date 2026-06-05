package com.example.demo;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The automation building blocks (iteration 13, Cap C) — the trigger and action vocabulary the
 * visual builder offers, plus a small one-click template library (the deterministic fallback for the
 * AI rule-suggestion surface, RB-40 §2). Pure registry, no I/O, unit-testable in isolation.
 */
public final class AutomationCatalog {

    private AutomationCatalog() { }

    public record Trigger(String id, String label, boolean scheduled) { }
    public record Action(String id, String label) { }
    public record Template(String name, String triggerType, String conditionExpr, String actionsJson) { }

    public static final String TR_ITEM_CREATED   = "ITEM_CREATED";
    public static final String TR_ITEM_UPDATED   = "ITEM_UPDATED";
    public static final String TR_STATUS_CHANGED = "STATUS_CHANGED";
    public static final String TR_ITEM_ASSIGNED  = "ITEM_ASSIGNED";
    public static final String TR_SCHEDULED      = "SCHEDULED";

    public static final String AC_SET_STATUS   = "SET_STATUS";
    public static final String AC_SET_PRIORITY = "SET_PRIORITY";
    public static final String AC_ASSIGN       = "ASSIGN";
    public static final String AC_ADD_COMMENT  = "ADD_COMMENT";
    public static final String AC_NOTIFY       = "NOTIFY";
    public static final String AC_POST_WEBHOOK = "POST_WEBHOOK";

    private static final List<Trigger> TRIGGERS = List.of(
        new Trigger(TR_ITEM_CREATED, "When a work item is created", false),
        new Trigger(TR_ITEM_UPDATED, "When a work item is updated", false),
        new Trigger(TR_STATUS_CHANGED, "When status changes", false),
        new Trigger(TR_ITEM_ASSIGNED, "When an item is assigned", false),
        new Trigger(TR_SCHEDULED, "On a schedule (cron)", true)
    );

    private static final List<Action> ACTIONS = List.of(
        new Action(AC_SET_STATUS, "Set status"),
        new Action(AC_SET_PRIORITY, "Set priority"),
        new Action(AC_ASSIGN, "Assign to user"),
        new Action(AC_ADD_COMMENT, "Add a comment"),
        new Action(AC_NOTIFY, "Notify"),
        new Action(AC_POST_WEBHOOK, "Post a webhook")
    );

    private static final List<Template> TEMPLATES = List.of(
        new Template("Triage P0 portal incidents", TR_ITEM_CREATED,
            "priority = Critical AND type = Incident",
            "[{\"type\":\"NOTIFY\",\"params\":{\"message\":\"New P0 incident\"}},"
            + "{\"type\":\"SET_STATUS\",\"params\":{\"status\":\"In Progress\"}}]"),
        new Template("Auto-done on merge", TR_STATUS_CHANGED,
            "status = In Review",
            "[{\"type\":\"ADD_COMMENT\",\"params\":{\"body\":\"PR merged — moving to Done.\"}},"
            + "{\"type\":\"SET_STATUS\",\"params\":{\"status\":\"Done\"}}]"),
        new Template("Escalate unassigned high-priority", TR_ITEM_CREATED,
            "priority = High",
            "[{\"type\":\"NOTIFY\",\"params\":{\"message\":\"High-priority item needs an owner\"}}]")
    );

    private static final Map<String, Trigger> TRIGGER_BY_ID =
        TRIGGERS.stream().collect(Collectors.toMap(Trigger::id, t -> t));
    private static final Map<String, Action> ACTION_BY_ID =
        ACTIONS.stream().collect(Collectors.toMap(Action::id, a -> a));

    public static List<Trigger> triggers() {
        return TRIGGERS;
    }

    public static List<Action> actions() {
        return ACTIONS;
    }

    public static List<Template> templates() {
        return TEMPLATES;
    }

    public static boolean isTrigger(String id) {
        return id != null && TRIGGER_BY_ID.containsKey(id.trim().toUpperCase());
    }

    public static boolean isAction(String id) {
        return id != null && ACTION_BY_ID.containsKey(id.trim().toUpperCase());
    }

    public static boolean isScheduled(String triggerId) {
        Trigger t = triggerId == null ? null : TRIGGER_BY_ID.get(triggerId.trim().toUpperCase());
        return t != null && t.scheduled();
    }
}
