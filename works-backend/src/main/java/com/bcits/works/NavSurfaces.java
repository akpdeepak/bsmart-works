package com.bcits.works;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Authoritative nav-surface → minimum-tier catalog. This is the single source of truth for which
 * navigation surfaces a member may SEE (the front-end consumes {@code /rbac/me.surfaces} and only
 * falls back to its own copy if the server omits it).
 *
 * <p>Tier hierarchy mirrors {@link RbacService}: VIEWER(1) &lt; MEMBER(2) &lt; LEAD(3) &lt;
 * ADMIN(4) &lt; OWNER(5). This governs nav VISIBILITY (declutter) only — it is NOT the access
 * boundary. Every action/query is still authorised by {@link RbacService} (RB-10 §2, RB-40 §1);
 * hiding a surface never grants or denies access.
 */
public final class NavSurfaces {

    private NavSurfaces() { }

    // Surface id (matches the front-end view ids / lib/routes.js) -> minimum tier that may see it.
    private static final Map<String, Integer> MIN_TIER = new LinkedHashMap<>();
    static {
        // Home
        MIN_TIER.put("dashboard", 1);
        MIN_TIER.put("myworks", 2);
        MIN_TIER.put("notifications", 2);
        // Deliver
        MIN_TIER.put("smcockpit", 3);
        MIN_TIER.put("board", 1);
        MIN_TIER.put("backlog", 2);
        MIN_TIER.put("sprint", 2);
        MIN_TIER.put("releases", 2);
        MIN_TIER.put("projects", 1);
        MIN_TIER.put("pm", 3);
        // Insight
        MIN_TIER.put("reports", 1);
        MIN_TIER.put("dashboards", 1);
        MIN_TIER.put("reportbuilder", 3);
        MIN_TIER.put("performance", 3);
        // Service
        MIN_TIER.put("service", 2);
        MIN_TIER.put("supportinbox", 2);
        MIN_TIER.put("sla", 2);
        MIN_TIER.put("compliance", 4);
        // Know
        MIN_TIER.put("knowledge", 1);
        MIN_TIER.put("knowledgeadvanced", 2);
        // Extend
        MIN_TIER.put("automations", 3);
        MIN_TIER.put("integrations", 4);
        MIN_TIER.put("aistudio", 4);
        MIN_TIER.put("marketplace", 4);
        MIN_TIER.put("developerportal", 4);
        // Set up
        MIN_TIER.put("workspace", 4);
        MIN_TIER.put("settings3", 4);
        MIN_TIER.put("aicontrol", 4);
        MIN_TIER.put("customization", 4);
        MIN_TIER.put("security", 5);
        MIN_TIER.put("trash", 3);
        // Satellite cockpits + BQL
        MIN_TIER.put("developer", 2);
        MIN_TIER.put("poworkspace", 3);
        MIN_TIER.put("leadership", 4);
        MIN_TIER.put("adminops", 4);
        MIN_TIER.put("bql", 2);
    }

    /** Minimum tier required to see a surface (defaults to 1 = everyone for unknown ids). */
    public static int minTier(String surface) {
        return MIN_TIER.getOrDefault(surface, 1);
    }

    /** The surfaces a user at {@code tier} may see, in catalog order. Owner (5) sees all. */
    public static List<String> visibleFor(int tier) {
        return MIN_TIER.entrySet().stream()
                .filter(e -> tier >= e.getValue())
                .map(Map.Entry::getKey)
                .toList();
    }
}
