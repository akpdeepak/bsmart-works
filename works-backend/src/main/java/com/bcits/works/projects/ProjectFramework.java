package com.bcits.works.projects;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Delivery framework selected for a {@link Project}. Beyond a stored label, each framework declares
 * the delivery capabilities it enables ({@link #capabilities()}), which the product uses to gate
 * framework-specific behaviour (e.g. Kanban and Waterfall do not run sprints). This replaces the
 * former dead {@code OperatingModelService.getFrameworkCapabilities}, which was never called and
 * covered only three of the six frameworks.
 *
 * <p>{@code CUSTOM} is intentionally permissive (everything enabled) so a workspace that has not
 * committed to a methodology is never blocked.
 */
public enum ProjectFramework {
    SCRUM(true, false, true),
    KANBAN(false, true, false),
    WATERFALL(false, false, false),
    LEAN(false, true, false),
    DSDM(true, false, true),
    XP(true, true, true),
    CUSTOM(true, true, true);

    /** Capability key: whether timeboxed sprints are part of this framework. */
    public static final String SPRINTS_ENABLED = "sprintsEnabled";
    /** Capability key: whether WIP limits are part of this framework. */
    public static final String WIP_LIMITS_ENABLED = "wipLimitsEnabled";
    /** Capability key: whether recurring ceremonies (standup/planning/retro) are part of this framework. */
    public static final String CEREMONIES_ENABLED = "ceremoniesEnabled";

    private final boolean sprintsEnabled;
    private final boolean wipLimitsEnabled;
    private final boolean ceremoniesEnabled;

    ProjectFramework(boolean sprintsEnabled, boolean wipLimitsEnabled, boolean ceremoniesEnabled) {
        this.sprintsEnabled = sprintsEnabled;
        this.wipLimitsEnabled = wipLimitsEnabled;
        this.ceremoniesEnabled = ceremoniesEnabled;
    }

    public boolean isSprintsEnabled() { return sprintsEnabled; }
    public boolean isWipLimitsEnabled() { return wipLimitsEnabled; }
    public boolean isCeremoniesEnabled() { return ceremoniesEnabled; }

    /** Whether {@code capabilityKey} is enabled for this framework; unknown keys default to false. */
    public boolean allows(String capabilityKey) {
        return switch (capabilityKey) {
            case SPRINTS_ENABLED -> sprintsEnabled;
            case WIP_LIMITS_ENABLED -> wipLimitsEnabled;
            case CEREMONIES_ENABLED -> ceremoniesEnabled;
            default -> false;
        };
    }

    /** Stable, ordered capability map for this framework — the API/UI shape. */
    public Map<String, Boolean> capabilities() {
        Map<String, Boolean> caps = new LinkedHashMap<>();
        caps.put(SPRINTS_ENABLED, sprintsEnabled);
        caps.put(WIP_LIMITS_ENABLED, wipLimitsEnabled);
        caps.put(CEREMONIES_ENABLED, ceremoniesEnabled);
        return caps;
    }

    /** Null-safe resolution: a project with no framework is treated as {@link #CUSTOM}. */
    public static ProjectFramework orDefault(ProjectFramework framework) {
        return framework == null ? CUSTOM : framework;
    }
}
