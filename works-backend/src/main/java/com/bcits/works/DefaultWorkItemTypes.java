package com.bcits.works;

import java.util.List;
import java.util.Map;

/**
 * The 7 built-in WorkItem types shipped in the MVP (I01-S06, Cap B): Epic, Story, Task, Bug,
 * Sub-task, Incident, Service Request — each with an icon and a brand-palette colour.
 *
 * <p>Single source of truth for the defaults (RB-30 / unification — one design system). Colours are
 * the constitution's Part-6 brand/semantic/neutral hexes (navy {@code #0B2F5C}, blue {@code #1E4D8C},
 * teal {@code #0E7C5E}, danger {@code #C0392B}, warn {@code #B97A00}, neutrals), aligned with the
 * frontend's type styling so the two never drift. Custom types (per-workspace) arrive in I03-S04.
 */
public final class DefaultWorkItemTypes {

    private DefaultWorkItemTypes() {}

    public static final List<Map<String, Object>> ALL = List.of(
        Map.of("typeKey", "EPIC",            "label", "Epic",            "icon", "⚡", "color", "#0B2F5C", "isCustom", false),
        Map.of("typeKey", "STORY",           "label", "Story",           "icon", "📖", "color", "#0E7C5E", "isCustom", false),
        Map.of("typeKey", "TASK",            "label", "Task",            "icon", "✓",  "color", "#1E4D8C", "isCustom", false),
        Map.of("typeKey", "BUG",             "label", "Bug",             "icon", "🐛", "color", "#C0392B", "isCustom", false),
        Map.of("typeKey", "SUBTASK",         "label", "Sub-task",        "icon", "↳",  "color", "#475569", "isCustom", false),
        Map.of("typeKey", "INCIDENT",        "label", "Incident",        "icon", "🔥", "color", "#B97A00", "isCustom", false),
        Map.of("typeKey", "SERVICE_REQUEST", "label", "Service Request", "icon", "🎫", "color", "#334155", "isCustom", false)
    );
}
