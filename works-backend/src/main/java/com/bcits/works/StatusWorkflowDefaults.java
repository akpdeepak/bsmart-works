package com.bcits.works;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Default status workflows per work-item type, grounded in the framework each discipline actually
 * runs (Scrum/SAFe for delivery, ITIL 4 for service, PMI/PRINCE2 RAID-log practice for risk).
 *
 * <p>The 16 built-in types collapse into 10 templates (types with an identical lifecycle share one).
 * Every status maps to exactly one of three categories — {@code TODO | IN_PROGRESS | DONE} — and
 * carries an {@code outcome} ({@code NEUTRAL | POSITIVE | NEGATIVE}) plus an optional lapse clock
 * (warn / breach hours; {@code null} = no clock). These are seeded defaults: a workspace can rename,
 * reorder, recategorise, recolour, retime, add, or delete any status from Settings afterward.
 *
 * <p>Pure data — no Spring, no I/O. {@link StatusConfigService} materialises these into the
 * existing {@code workflow} / {@code workflow_status} tables per workspace on first read.
 */
public final class StatusWorkflowDefaults {

    private StatusWorkflowDefaults() {}

    /** One seeded status. {@code warnHours}/{@code breachHours} may be null (no lapse clock). */
    public record SeedStatus(String name, String category, String color, String outcome,
                             boolean initial, Double warnHours, Double breachHours) {}

    // Palette (hex; the frontend maps these onto its own tokens where it can).
    private static final String GRAY  = "#94A3B8"; // TODO / neutral
    private static final String AMBER = "#B97A00"; // waiting / on-hold
    private static final String NAVY  = "#1E4D8C"; // in progress
    private static final String TEAL  = "#0E7C5E"; // review / resolved / done-positive
    private static final String RED   = "#C0392B"; // closed-out / negative
    private static final String FLAME = "#E94E1B"; // escalated / blocked flag

    private static SeedStatus todo(String n, boolean init, Double w, Double b)  { return new SeedStatus(n, "TODO",        GRAY,  "NEUTRAL",  init, w, b); }
    private static SeedStatus wait(String n, Double w, Double b)                { return new SeedStatus(n, "TODO",        AMBER, "NEUTRAL",  false, w, b); }
    private static SeedStatus prog(String n, Double w, Double b)                { return new SeedStatus(n, "IN_PROGRESS", NAVY,  "NEUTRAL",  false, w, b); }
    private static SeedStatus hold(String n, Double w, Double b)                { return new SeedStatus(n, "IN_PROGRESS", AMBER, "NEUTRAL",  false, w, b); }
    private static SeedStatus review(String n, Double w, Double b)             { return new SeedStatus(n, "IN_PROGRESS", TEAL,  "NEUTRAL",  false, w, b); }
    private static SeedStatus flag(String n, Double w, Double b)                { return new SeedStatus(n, "IN_PROGRESS", FLAME, "NEUTRAL",  false, w, b); }
    private static SeedStatus donePos(String n)                                 { return new SeedStatus(n, "DONE",        TEAL,  "POSITIVE", false, null, null); }
    private static SeedStatus doneNeg(String n)                                 { return new SeedStatus(n, "DONE",        RED,   "NEGATIVE", false, null, null); }

    // ── The 10 templates ────────────────────────────────────────────────────────
    private static final Map<String, List<SeedStatus>> TEMPLATES = new LinkedHashMap<>();
    static {
        // Portfolio — SAFe Portfolio Kanban (funded decisions stay TODO until work starts).
        TEMPLATES.put("PORTFOLIO", List.of(
            todo("Proposed", true, null, null),
            wait("Under Review", null, null),
            todo("Approved", false, null, null),
            prog("In Progress", null, null),
            donePos("Done"),
            doneNeg("Cancelled")));

        // Epic — SAFe / Jira epic.
        TEMPLATES.put("EPIC", List.of(
            todo("New", true, null, null),
            todo("Backlog", false, null, null),
            prog("In Progress", null, null),
            review("In Review", null, null),
            donePos("Done"),
            doneNeg("Cancelled")));

        // Deliverable — classic Scrum board (Story / Task / Activity).
        TEMPLATES.put("DELIVERABLE", List.of(
            todo("To Do", true, null, null),
            prog("In Progress", 48.0, 120.0),
            review("In Review", 24.0, 48.0),
            donePos("Done"),
            flag("Blocked", 24.0, 72.0)));

        // Defect — defect lifecycle with QA verification + reopen loop.
        TEMPLATES.put("DEFECT", List.of(
            todo("New", true, 8.0, 24.0),
            wait("Triaged", 24.0, 72.0),
            prog("In Progress", 24.0, 72.0),
            review("In Review", 8.0, 24.0),
            review("In Test", 8.0, 24.0),
            donePos("Closed"),
            flag("Reopened", 8.0, 24.0),
            doneNeg("Won't Fix")));

        // Incident — ITIL 4 incident management (Resolved ≠ Closed).
        TEMPLATES.put("INCIDENT", List.of(
            todo("New", true, 0.25, 0.5),
            wait("Assigned", 0.5, 1.0),
            prog("In Progress", 2.0, 4.0),
            hold("On Hold", null, null),
            review("Resolved", 1.0, 4.0),
            donePos("Closed"),
            flag("Escalated", 1.0, 2.0)));

        // Service Request — ITIL request fulfilment (HR / IT), with approval gate.
        TEMPLATES.put("SERVICE_REQUEST", List.of(
            todo("Submitted", true, 0.5, 2.0),
            wait("Pending Approval", 4.0, 24.0),
            prog("In Progress", 8.0, 48.0),
            hold("Awaiting Info", null, null),
            donePos("Fulfilled"),
            doneNeg("Rejected"),
            doneNeg("Cancelled")));

        // Risk — PMI risk register (two positive exits: Closed + Accepted).
        TEMPLATES.put("RISK", List.of(
            todo("Identified", true, 48.0, 120.0),
            wait("Assessing", 72.0, 168.0),
            prog("Mitigating", 120.0, 336.0),
            review("Monitoring", null, null),
            donePos("Closed"),
            donePos("Accepted"),
            doneNeg("Materialized")));

        // Issue — PMI / PRINCE2 issue log.
        TEMPLATES.put("ISSUE", List.of(
            todo("Open", true, 24.0, 72.0),
            wait("Investigating", 24.0, 72.0),
            prog("In Progress", 48.0, 120.0),
            donePos("Resolved"),
            donePos("Closed"),
            flag("Escalated", 8.0, 24.0)));

        // Assumption — validated to Confirmed or Invalidated.
        TEMPLATES.put("ASSUMPTION", List.of(
            todo("Stated", true, null, null),
            prog("Validating", 72.0, 168.0),
            donePos("Confirmed"),
            doneNeg("Invalidated")));

        // Dependency — dependency log with Blocked flag.
        TEMPLATES.put("DEPENDENCY", List.of(
            todo("Identified", true, null, null),
            wait("Committed", null, null),
            prog("In Progress", null, null),
            donePos("Delivered"),
            flag("Blocked", 24.0, 72.0)));
    }

    // ── Type → template map (the 16 built-in types) ──────────────────────────────
    private static final Map<String, String> TYPE_TO_TEMPLATE = new LinkedHashMap<>();
    static {
        // Delivery
        TYPE_TO_TEMPLATE.put("CAPABILITY", "PORTFOLIO");
        TYPE_TO_TEMPLATE.put("PRODUCT",    "PORTFOLIO");
        TYPE_TO_TEMPLATE.put("INITIATIVE", "PORTFOLIO");
        TYPE_TO_TEMPLATE.put("THEME",      "PORTFOLIO");
        TYPE_TO_TEMPLATE.put("EPIC",       "EPIC");
        TYPE_TO_TEMPLATE.put("STORY",      "DELIVERABLE");
        TYPE_TO_TEMPLATE.put("TASK",       "DELIVERABLE");
        TYPE_TO_TEMPLATE.put("ACTIVITY",   "DELIVERABLE");
        TYPE_TO_TEMPLATE.put("BUG",        "DEFECT");
        // RAID
        TYPE_TO_TEMPLATE.put("RISK",       "RISK");
        TYPE_TO_TEMPLATE.put("ISSUE",      "ISSUE");
        TYPE_TO_TEMPLATE.put("ASSUMPTION", "ASSUMPTION");
        TYPE_TO_TEMPLATE.put("DEPENDENCY", "DEPENDENCY");
        // Service
        TYPE_TO_TEMPLATE.put("INCIDENT",            "INCIDENT");
        TYPE_TO_TEMPLATE.put("HR_SERVICE_REQUEST",  "SERVICE_REQUEST");
        TYPE_TO_TEMPLATE.put("IT_SERVICE_REQUEST",  "SERVICE_REQUEST");
    }

    /** The 16 built-in type keys, in seeding order. */
    public static List<String> allTypeKeys() {
        return List.copyOf(TYPE_TO_TEMPLATE.keySet());
    }

    /** Seeded statuses for a type key, or empty if the type is unknown. */
    public static List<SeedStatus> forType(String typeKey) {
        String template = TYPE_TO_TEMPLATE.get(typeKey);
        return template != null ? TEMPLATES.get(template) : List.of();
    }
}
