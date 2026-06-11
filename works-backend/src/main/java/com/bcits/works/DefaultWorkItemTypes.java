package com.bcits.works;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Single source of truth for the 16 built-in work-item types across three categories:
 * Delivery (9 types), RAID (4 types), and Service (3 types).
 * NOTE: "Project" is a first-class container, not a work-item type.
 *
 * <p>VALID_CHILDREN enforces the parent→child hierarchy at the API layer.
 * MOVABLE_TYPES gates which item types support the "Move to…" parent reassignment.
 * AUTO_ID_PREFIX_MAP is used for sequential human-readable ID generation (EP-0001, INC-0001, …).
 *
 * <p>Colours are brand/semantic/neutral hexes from the constitution (Part-6).
 */
public final class DefaultWorkItemTypes {

    private DefaultWorkItemTypes() {}

    /**
     * Maps each parent type to the set of child types it may contain.
     * Hierarchy: Capability/Product (roots) → Initiative → Theme → Epic → Story/Bug → Task → Activity
     */
    public static final Map<String, Set<String>> VALID_CHILDREN = Map.ofEntries(
        Map.entry("CAPABILITY",         Set.of("PRODUCT", "INITIATIVE", "THEME")),
        Map.entry("PRODUCT",            Set.of("INITIATIVE")),
        Map.entry("INITIATIVE",         Set.of("THEME", "EPIC")),
        Map.entry("THEME",              Set.of("EPIC")),
        Map.entry("EPIC",               Set.of("STORY", "BUG", "TASK")),
        Map.entry("STORY",              Set.of("TASK", "BUG", "ACTIVITY")),
        Map.entry("BUG",                Set.of("TASK", "ACTIVITY")),
        Map.entry("TASK",               Set.of("ACTIVITY")),
        Map.entry("INCIDENT",           Set.of("TASK")),
        Map.entry("HR_SERVICE_REQUEST", Set.of("TASK")),
        Map.entry("IT_SERVICE_REQUEST", Set.of("TASK"))
    );

    /** Types that support the Move To… parent-reassignment feature. */
    public static final Set<String> MOVABLE_TYPES = Set.of("STORY", "BUG", "TASK", "ACTIVITY");

    /** Returns the auto-ID prefix for a given type key, e.g. "EPIC" → "EP". */
    public static String prefixFor(String typeKey) {
        return ALL.stream()
            .filter(t -> typeKey.equalsIgnoreCase((String) t.get("typeKey")))
            .map(t -> (String) t.get("autoIdPrefix"))
            .findFirst()
            .orElse("WI");
    }

    public static final List<Map<String, Object>> ALL = List.of(

        // ── DELIVERY ───────────────────────────────────────────────────────────
        Map.of("typeKey", "CAPABILITY",
               "label", "Capability",          "icon", "target",
               "color", "#0B2F5C",             "isCustom", false,
               "category", "DELIVERY",         "autoIdPrefix", "CAP",
               "validParents", List.of(),
               "description", "Top-level business capability"),

        Map.of("typeKey", "PRODUCT",
               "label", "Product",             "icon", "package",
               "color", "#334155",             "isCustom", false,
               "category", "DELIVERY",         "autoIdPrefix", "PRD",
               "validParents", List.of("CAPABILITY"),
               "description", "A BCITS product — rolls up to a Capability"),

        Map.of("typeKey", "INITIATIVE",
               "label", "Initiative",          "icon", "rocket",
               "color", "#0E7C5E",             "isCustom", false,
               "category", "DELIVERY",         "autoIdPrefix", "INI",
               "validParents", List.of("CAPABILITY", "PRODUCT"),
               "description", "Strategic effort — maps to a Capability or Product roadmap"),

        Map.of("typeKey", "THEME",
               "label", "Theme",               "icon", "layers",
               "color", "#1E4D8C",             "isCustom", false,
               "category", "DELIVERY",         "autoIdPrefix", "THM",
               "validParents", List.of("CAPABILITY", "INITIATIVE"),
               "description", "Strategic grouping of Epics — sits between Initiative and Epic"),

        Map.of("typeKey", "EPIC",
               "label", "Epic",                "icon", "zap",
               "color", "#0B2F5C",             "isCustom", false,
               "category", "DELIVERY",         "autoIdPrefix", "EP",
               "validParents", List.of("INITIATIVE", "THEME"),
               "description", "Large body of work spanning multiple sprints"),

        Map.of("typeKey", "STORY",
               "label", "Story",               "icon", "book-open",
               "color", "#0E7C5E",             "isCustom", false,
               "category", "DELIVERY",         "autoIdPrefix", "ST",
               "validParents", List.of("EPIC"),
               "description", "User-facing feature — As a… I want… So that…"),

        Map.of("typeKey", "BUG",
               "label", "Bug",                 "icon", "bug",
               "color", "#C0392B",             "isCustom", false,
               "category", "DELIVERY",         "autoIdPrefix", "BUG",
               "validParents", List.of("EPIC", "STORY"),
               "description", "Software defect requiring a fix"),

        Map.of("typeKey", "TASK",
               "label", "Task",                "icon", "check-square",
               "color", "#1E4D8C",             "isCustom", false,
               "category", "DELIVERY",         "autoIdPrefix", "TK",
               "validParents", List.of("EPIC", "STORY", "BUG",
                                       "INCIDENT", "HR_SERVICE_REQUEST", "IT_SERVICE_REQUEST"),
               "description", "Atomic unit of work (hours-level)"),

        Map.of("typeKey", "ACTIVITY",
               "label", "Activity",            "icon", "corner-down-right",
               "color", "#475569",             "isCustom", false,
               "category", "DELIVERY",         "autoIdPrefix", "ACT",
               "validParents", List.of("STORY", "BUG", "TASK"),
               "description", "Sub-level action or checklist item"),

        // ── RAID ───────────────────────────────────────────────────────────────
        Map.of("typeKey", "RISK",
               "label", "Risk",                "icon", "alert-triangle",
               "color", "#B97A00",             "isCustom", false,
               "category", "RAID",             "autoIdPrefix", "RSK",
               "validParents", List.of(),
               "description", "Potential future problem — tracked with probability × impact"),

        Map.of("typeKey", "ISSUE",
               "label", "Issue",               "icon", "flame",
               "color", "#C0392B",             "isCustom", false,
               "category", "RAID",             "autoIdPrefix", "ISS",
               "validParents", List.of(),
               "description", "Confirmed project-level problem affecting delivery"),

        Map.of("typeKey", "ASSUMPTION",
               "label", "Assumption",          "icon", "lightbulb",
               "color", "#B97A00",             "isCustom", false,
               "category", "RAID",             "autoIdPrefix", "ASM",
               "validParents", List.of(),
               "description", "Something taken as true — needs active validation"),

        Map.of("typeKey", "DEPENDENCY",
               "label", "Dependency",          "icon", "git-branch",
               "color", "#475569",             "isCustom", false,
               "category", "RAID",             "autoIdPrefix", "DEP",
               "validParents", List.of(),
               "description", "A dependency on another team, system, or deliverable"),

        // ── SERVICE ────────────────────────────────────────────────────────────
        Map.of("typeKey", "INCIDENT",
               "label", "Incident",            "icon", "shield",
               "color", "#C0392B",             "isCustom", false,
               "category", "SERVICE",          "autoIdPrefix", "INC",
               "validParents", List.of(),
               "description", "Live operational problem affecting a system or service"),

        Map.of("typeKey", "HR_SERVICE_REQUEST",
               "label", "HR Service Request",  "icon", "users",
               "color", "#0E7C5E",             "isCustom", false,
               "category", "SERVICE",          "autoIdPrefix", "HR",
               "validParents", List.of(),
               "description", "People and HR request — leave, onboarding, payroll, etc."),

        Map.of("typeKey", "IT_SERVICE_REQUEST",
               "label", "IT Service Request",  "icon", "wrench",
               "color", "#1E4D8C",             "isCustom", false,
               "category", "SERVICE",          "autoIdPrefix", "IT",
               "validParents", List.of(),
               "description", "Technology request — hardware, software access, network, etc.")
    );
}
