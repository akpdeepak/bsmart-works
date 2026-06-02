package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.regex.*;
import jakarta.validation.Valid;

/**
 * WIQL — Work Item Query Language
 * Composable filter syntax: field operator value [AND/OR ...]
 * Examples:
 *   priority = Highest AND assignee = currentUser()
 *   status != Done AND type = Bug
 *   dueDate < today() AND priority IN (High, Highest)
 */
@RestController
@RequestMapping("/api/v1/wiql")
public class WiqlController {

    private final JdbcTemplate jdbc;
    private final WiqlFilterRepository filterRepo;
    private final AuthenticatedUser authenticatedUser;

    public WiqlController(JdbcTemplate jdbc,
                          WiqlFilterRepository filterRepo,
                          AuthenticatedUser authenticatedUser) {
        this.jdbc = jdbc;
        this.filterRepo = filterRepo;
        this.authenticatedUser = authenticatedUser;
    }

    @PostMapping("/execute")
    public List<Map<String, Object>> execute(@Valid @RequestBody Map<String, String> body) {
        String query = body.getOrDefault("query", "").trim();
        String userId = authenticatedUser.id();
        if (query.isEmpty()) {
            return jdbc.queryForList(
                "SELECT id, title, status, type, priority, assignee_id, project_id, due_date, created_at " +
                "FROM work_items WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100");
        }
        try {
            String sql = buildSql(query, userId);
            return jdbc.queryForList(sql);
        } catch (Exception e) {
            throw new IllegalArgumentException("WIQL parse error: " + e.getMessage());
        }
    }

    @PostMapping("/validate")
    public Map<String, Object> validate(@Valid @RequestBody Map<String, String> body) {
        String query = body.getOrDefault("query", "").trim();
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            buildSql(query, "validate");
            result.put("valid", true);
        } catch (Exception e) {
            result.put("valid", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    // Saved WIQL filters
    @GetMapping("/filters")
    public List<WiqlFilter> listFilters() {
        String userId = authenticatedUser.id();
        String workspaceId = getWorkspaceForUser(userId);
        List<WiqlFilter> mine = filterRepo.findByWorkspaceIdAndCreatedBy(workspaceId, userId);
        List<WiqlFilter> shared = filterRepo.findByWorkspaceIdAndIsSharedTrue(workspaceId);
        Set<String> ids = new HashSet<>();
        List<WiqlFilter> combined = new ArrayList<>();
        for (WiqlFilter f : mine) { ids.add(f.getId()); combined.add(f); }
        for (WiqlFilter f : shared) { if (!ids.contains(f.getId())) combined.add(f); }
        return combined;
    }

    @PostMapping("/filters")
    public WiqlFilter saveFilter(@Valid @RequestBody WiqlFilter filter) {
        String userId = authenticatedUser.id();
        filter.setId("WIQL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        filter.setCreatedBy(userId);
        filter.setWorkspaceId(getWorkspaceForUser(userId));
        filter.setCreatedAt(OffsetDateTime.now());
        return filterRepo.save(filter);
    }

    @DeleteMapping("/filters/{id}")
    public Map<String, String> deleteFilter(@PathVariable String id) {
        filterRepo.deleteById(id);
        return Map.of("message", "Filter deleted");
    }

    // ---------------------------------------------------------------
    // WIQL → SQL translator
    // ---------------------------------------------------------------

    private String buildSql(String query, String currentUserId) {
        StringBuilder sb = new StringBuilder(
            "SELECT id, title, status, type, priority, assignee_id, project_id, due_date, created_at " +
            "FROM work_items WHERE deleted_at IS NULL");

        String where = translateWiql(query.trim(), currentUserId);
        if (!where.isEmpty()) sb.append(" AND (").append(where).append(")");
        sb.append(" ORDER BY created_at DESC LIMIT 500");
        return sb.toString();
    }

    private String translateWiql(String query, String currentUserId) {
        // Tokenize: split on AND/OR (case-insensitive) while keeping delimiters
        // Each token is a single condition like: priority = Highest
        List<String> parts = new ArrayList<>();
        List<String> connectors = new ArrayList<>();

        Pattern andOr = Pattern.compile("\\s+(AND|OR)\\s+", Pattern.CASE_INSENSITIVE);
        Matcher m = andOr.matcher(query);
        int last = 0;
        while (m.find()) {
            parts.add(query.substring(last, m.start()).trim());
            connectors.add(m.group(1).toUpperCase());
            last = m.end();
        }
        parts.add(query.substring(last).trim());

        StringBuilder result = new StringBuilder();
        for (int i = 0; i < parts.size(); i++) {
            if (i > 0) result.append(" ").append(connectors.get(i - 1)).append(" ");
            result.append(translateCondition(parts.get(i).trim(), currentUserId));
        }
        return result.toString();
    }

    private String translateCondition(String cond, String currentUserId) {
        // Handle IN: field IN (v1, v2, ...)
        Pattern inPat = Pattern.compile("^(\\w+)\\s+IN\\s+\\((.+)\\)$", Pattern.CASE_INSENSITIVE);
        Matcher inM = inPat.matcher(cond);
        if (inM.matches()) {
            String field = mapField(inM.group(1));
            String[] vals = inM.group(2).split(",");
            StringBuilder sb = new StringBuilder(field).append(" IN (");
            for (int i = 0; i < vals.length; i++) {
                if (i > 0) sb.append(",");
                sb.append("'").append(escape(vals[i].trim())).append("'");
            }
            sb.append(")");
            return sb.toString();
        }

        // Handle: field op value
        Pattern condPat = Pattern.compile("^(\\w+)\\s*(=|!=|<>|>=|<=|>|<|CONTAINS|STARTSWITH)\\s*(.+)$", Pattern.CASE_INSENSITIVE);
        Matcher condM = condPat.matcher(cond);
        if (condM.matches()) {
            String field = mapField(condM.group(1));
            String op = condM.group(2).toUpperCase();
            String value = resolveValue(condM.group(3).trim(), currentUserId);

            return switch (op) {
                case "!=" , "<>" -> field + " != " + value;
                case ">=" -> field + " >= " + value;
                case "<=" -> field + " <= " + value;
                case ">" -> field + " > " + value;
                case "<" -> field + " < " + value;
                case "CONTAINS" -> field + " ILIKE '%" + escape(condM.group(3).trim()) + "%'";
                case "STARTSWITH" -> field + " ILIKE '" + escape(condM.group(3).trim()) + "%'";
                default -> field + " = " + value;
            };
        }
        throw new IllegalArgumentException("Cannot parse condition: " + cond);
    }

    private String mapField(String field) {
        return switch (field.toLowerCase()) {
            case "priority"  -> "priority";
            case "status"    -> "status";
            case "type"      -> "type";
            case "assignee"  -> "assignee_id";
            case "reporter"  -> "created_by";
            case "project"   -> "project_id";
            case "duedate", "due_date" -> "due_date";
            case "createdat", "created_at" -> "created_at";
            case "sprint"    -> "sprint_id";
            case "storypoints", "points" -> "story_points";
            default -> field.toLowerCase();
        };
    }

    private String resolveValue(String value, String currentUserId) {
        if ("currentUser()".equalsIgnoreCase(value)) return "'" + escape(currentUserId) + "'";
        if ("today()".equalsIgnoreCase(value)) return "CURRENT_DATE";
        if ("now()".equalsIgnoreCase(value)) return "NOW()";
        // Strip quotes if present
        if ((value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return "'" + escape(value.substring(1, value.length() - 1)) + "'";
        }
        // Numbers stay as-is
        if (value.matches("-?\\d+(\\.\\d+)?")) return value;
        return "'" + escape(value) + "'";
    }

    private String escape(String s) {
        return s.replace("'", "''");
    }

    private String getWorkspaceForUser(String userId) {
        try {
            return jdbc.queryForObject(
                "SELECT workspace_id FROM users WHERE id = ?", String.class, userId);
        } catch (Exception e) {
            return "WS-001";
        }
    }
}
