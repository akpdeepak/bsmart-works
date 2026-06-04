package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

/**
 * Pure matcher for saved-filter subscriptions (iteration-2 follow-up). Mirrors the frontend
 * applyFilter logic: a saved filter is { "type": mine|priority|itemType|blockers, "value"? }.
 * No I/O — unit-testable in isolation.
 */
@Service
public class SavedFilterMatcher {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Does a work item (by its fields) match the saved filter for the given filter owner? */
    public boolean matches(String filterJson, String ownerId, String priority, String type, String assigneeId) {
        if (filterJson == null || filterJson.isBlank()) return false;
        try {
            JsonNode f = MAPPER.readTree(filterJson);
            String value = f.path("value").asText("");
            return switch (f.path("type").asText("")) {
                case "mine" -> ownerId != null && ownerId.equals(assigneeId);
                case "priority" -> value.equals(priority);
                case "itemType" -> value.equals(type);
                case "blockers" -> "CRITICAL".equals(priority) || "Incident".equals(type);
                default -> false;
            };
        } catch (Exception e) {
            return false;
        }
    }
}
