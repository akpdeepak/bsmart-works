package com.bcits.works;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Pure scope-resolution for work-item aggregation (iteration 6 — Insights). Translates a
 * dashboard/report scope into a parameterised SQL predicate over work_items. No I/O, so it
 * is unit-testable in isolation; the controller performs the actual queries.
 *
 * Scopes: PERSONAL (my assigned items) · PROJECT (one project) · TEAM (the team's projects)
 * · ORG (a whole workspace, else everything).
 */
@Service
public class AggregationService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** A parameterised WHERE fragment (no leading WHERE) plus its bind parameters. */
    public record ScopeFilter(String sql, Object[] params) {}

    /** Parse a team's project_ids JSONB array into a list; empty/invalid → empty list. */
    public List<String> parseProjectIds(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return Arrays.asList(MAPPER.readValue(json, String[].class));
        } catch (Exception e) {
            return List.of();
        }
    }

    /**
     * Build the scope predicate. {@code teamProjectIds} is the resolved project list for a
     * TEAM scope (the controller loads the team and parses it); all values are bound, never
     * concatenated, so this is injection-safe.
     */
    public ScopeFilter resolve(String scope, String userId, String projectId,
                               List<String> teamProjectIds, String workspaceId) {
        String s = scope == null ? "ORG" : scope.toUpperCase();
        switch (s) {
            case "PERSONAL":
                return new ScopeFilter("assignee_id = ?", new Object[]{ userId == null ? "" : userId });
            case "PROJECT":
                return new ScopeFilter("project_id = ?", new Object[]{ projectId == null ? "" : projectId });
            case "TEAM":
                if (teamProjectIds == null || teamProjectIds.isEmpty()) {
                    return new ScopeFilter("1 = 0", new Object[]{});  // a team with no projects matches nothing
                }
                String placeholders = teamProjectIds.stream().map(x -> "?").collect(Collectors.joining(","));
                return new ScopeFilter("project_id IN (" + placeholders + ")", new ArrayList<>(teamProjectIds).toArray());
            case "ORG":
                if (workspaceId != null && !workspaceId.isBlank()) {
                    return new ScopeFilter("project_id IN (SELECT id FROM projects WHERE workspace_id = ?)",
                        new Object[]{ workspaceId });
                }
                return new ScopeFilter("1 = 1", new Object[]{});
            default:
                return new ScopeFilter("1 = 1", new Object[]{});
        }
    }
}
