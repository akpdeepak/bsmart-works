package com.bcits.works.workspaces;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Arrays;
import java.util.Map;
import java.util.HashMap;

/**
 * Service to centralize the 5 V1.6 User Types and capability guards based on frameworks.
 */
@Service
public class OperatingModelService {

    public static final String TYPE_INDIVIDUAL = "INDIVIDUAL";
    public static final String TYPE_TEAM_LEAD = "TEAM_LEAD";
    public static final String TYPE_MANAGEMENT = "MANAGEMENT";
    public static final String TYPE_ADMIN = "ADMIN";
    public static final String TYPE_OWNER = "OWNER";

    public static final List<String> USER_TYPES = Arrays.asList(
        TYPE_INDIVIDUAL, TYPE_TEAM_LEAD, TYPE_MANAGEMENT, TYPE_ADMIN, TYPE_OWNER
    );

    /**
     * Determines capabilities based on the selected framework.
     * e.g., Scrum enables sprints, Kanban disables sprints.
     */
    public Map<String, Boolean> getFrameworkCapabilities(String framework) {
        Map<String, Boolean> caps = new HashMap<>();
        if ("SCRUM".equalsIgnoreCase(framework)) {
            caps.put("sprintsEnabled", true);
            caps.put("wipLimitsEnabled", false);
            caps.put("ceremoniesEnabled", true);
        } else if ("KANBAN".equalsIgnoreCase(framework)) {
            caps.put("sprintsEnabled", false);
            caps.put("wipLimitsEnabled", true);
            caps.put("ceremoniesEnabled", false);
        } else if ("XP".equalsIgnoreCase(framework)) {
            caps.put("sprintsEnabled", true);
            caps.put("wipLimitsEnabled", true);
            caps.put("ceremoniesEnabled", true);
        } else {
            // Default capabilities
            caps.put("sprintsEnabled", true);
            caps.put("wipLimitsEnabled", false);
            caps.put("ceremoniesEnabled", false);
        }
        return caps;
    }
}
