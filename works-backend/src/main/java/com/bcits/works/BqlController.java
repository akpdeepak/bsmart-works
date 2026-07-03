package com.bcits.works;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.BqlException;
import com.bcits.works.shared.BqlField;
import com.bcits.works.shared.BqlFieldRegistry;

import com.bcits.works.shared.BqlContext;

import com.bcits.works.shared.BqlCompiler;
import com.bcits.works.shared.BqlContextFactory;
import com.bcits.works.shared.BqlExecutionService;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import jakarta.validation.Valid;

/**
 * BQL — bSmart Query Language.
 * Composable filter syntax: {@code field operator value [AND/OR ...]}, with grouping, {@code NOT},
 * {@code IN}/{@code NOT IN}, {@code BETWEEN}, {@code IS [NOT] EMPTY}, and date functions.
 *
 * <p>Parsing/compilation lives in {@link BqlCompiler}; this controller stays thin. It is the
 * <b>user-facing</b> query path, so two governance rules apply here that the system-side consumers
 * already enforce: <b>every result set is workspace-scoped</b> (RB-40 §1 — closes the former
 * cross-tenant leak) and field access is gated by {@link BqlContext} (field-level security).
 */
@RestController
@RequestMapping("/api/v1/bql")
public class BqlController {

    /** Sort fields a user may order by — resolved through the same allow-list, defends ORDER BY. */
    private static final Set<String> SORTABLE = Set.of(
        "created_at", "updated_at", "due_date", "priority", "status", "story_points", "title");

    /**
     * Low-cardinality columns a result set may be grouped by (the board/group-by view). Each must be
     * a real {@code work_items} column (resolved through {@link BqlFieldRegistry}) so the GROUP BY
     * target is never user-controlled SQL — it is matched against this allow-list, defending the
     * grouped query exactly as {@link #SORTABLE} defends ORDER BY.
     */
    private static final Set<String> GROUPABLE = Set.of(
        "status", "type", "priority", "severity", "assignee_id", "project_id", "sprint_id");

    /** Matches a trailing {@code ORDER BY …} clause (JQL-style) in a query string. */
    private static final java.util.regex.Pattern ORDER_BY =
        java.util.regex.Pattern.compile("(?i)\\s+ORDER\\s+BY\\s+(.+)$");

    private final JdbcTemplate jdbc;
    private final BqlCompiler compiler;
    private final BqlExecutionService execution;
    private final BqlContextFactory contextFactory;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public BqlController(JdbcTemplate jdbc,
                         BqlCompiler compiler,
                         BqlExecutionService execution,
                         BqlContextFactory contextFactory,
                         AuthenticatedUser authenticatedUser,
                         RbacService rbac) {
        this.jdbc = jdbc;
        this.compiler = compiler;
        this.execution = execution;
        this.contextFactory = contextFactory;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @PostMapping("/execute")
    public List<Map<String, Object>> execute(@Valid @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        String workspaceId = resolveWorkspace(userId, body.get("workspaceId"));
        String rawQuery = body.getOrDefault("query", "").trim();
        // An in-query `ORDER BY …` (JQL-style) takes precedence over the sort param, then is stripped
        // so the WHERE compiler never sees it.
        String inlineSort = extractInlineOrderBy(rawQuery);
        String query = stripOrderBy(rawQuery);
        String sort = inlineSort != null ? inlineSort : orderBy(body.get("sort"));
        int size = clampSize(body.get("size"));
        int offset = pageOffset(body.get("page"), size);

        try {
            // Workspace scope (RB-40 §1) is applied centrally inside the execution service.
            return execution.execute(workspaceId, contextFor(userId, workspaceId), query, sort, size, offset);
        } catch (BqlException e) {
            throw new IllegalArgumentException("BQL parse error: " + e.getMessage());
        }
    }

    @PostMapping("/validate")
    public Map<String, Object> validate(@Valid @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        String workspaceId = resolveWorkspace(userId, body.get("workspaceId"));
        // Strip any trailing ORDER BY so the predicate validates like it runs (execute() does the same).
        String query = stripOrderBy(body.getOrDefault("query", "").trim());
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            compiler.compileFor(query, contextFor(userId, workspaceId));
            result.put("valid", true);
        } catch (BqlException e) {
            result.put("valid", false);
            result.put("error", e.getMessage());
            result.put("position", e.getPosition());
        }
        return result;
    }

    /**
     * Group a BQL result set by a low-cardinality field and return the count per group — the data
     * behind the board (kanban) and group-by views. Same governance as {@code /execute}: hard
     * workspace scope plus field-level security on the predicate. The {@code groupBy} target is
     * resolved through the allow-list and checked against {@link #GROUPABLE}, so it is never raw
     * user SQL. Buckets are ordered largest-first; a {@code null} group value (e.g. unassigned) is
     * returned as an empty string so the client can render an "unassigned" lane.
     */
    @PostMapping("/group")
    public List<Map<String, Object>> group(@Valid @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        String workspaceId = resolveWorkspace(userId, body.get("workspaceId"));
        String groupCol = resolveGroupBy(body.get("groupBy"));
        String query = stripOrderBy(body.getOrDefault("query", "").trim());

        List<Object> params = new ArrayList<>();
        params.add(workspaceId);
        String base = "SELECT COALESCE(" + groupCol + "::text, '') AS value, COUNT(*) AS count"
            + " FROM work_items"
            + " WHERE deleted_at IS NULL"
            + " AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)";
        try {
            BqlCompiler.Compiled c = compiler.compileFor(query, contextFor(userId, workspaceId));
            String sql = base
                + (c.sql().isEmpty() ? "" : " AND (" + c.sql() + ")")
                + " GROUP BY " + groupCol
                + " ORDER BY count DESC, value ASC";
            params.addAll(c.params());
            return jdbc.queryForList(sql, params.toArray());
        } catch (BqlException e) {
            throw new IllegalArgumentException("BQL parse error: " + e.getMessage());
        }
    }

    /**
     * Grammar metadata for the editor: the fields this user may query (field-level security
     * applied), the operators/functions, and enum value suggestions. Lets the client drive
     * autocomplete + the visual builder without hard-coding the grammar.
     */
    @GetMapping("/schema")
    public Map<String, Object> schema(@RequestParam(required = false) String workspaceId) {
        String userId = authenticatedUser.id();
        String wsId = resolveWorkspace(userId, workspaceId);
        BqlContext ctx = contextFor(userId, wsId);

        List<Map<String, Object>> fields = new ArrayList<>();
        for (BqlField f : BqlFieldRegistry.visibleFields(ctx)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("alias", f.alias());
            m.put("column", f.column());
            m.put("type", f.type().name().toLowerCase(Locale.ROOT));
            m.put("custom", false);
            fields.add(m);
        }
        // Workspace custom fields are queryable too (RB-10 §6) — surface them for autocomplete.
        ctx.customFields().forEach((key, cf) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("alias", key);
            m.put("column", key);
            m.put("type", cf.type().name().toLowerCase(Locale.ROOT));
            m.put("custom", true);
            fields.add(m);
        });
        // Virtual full-text field: `text ~ "..."` searches title + description together.
        fields.add(Map.of("alias", "text", "column", "title+description", "type", "text", "custom", false));
        // Virtual collection field: `labels = X` / `labels IN (..)` query the tags table.
        fields.add(Map.of("alias", "labels", "column", "tags", "type", "text", "custom", false));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("fields", fields);
        out.put("operators", List.of("=", "!=", ">", "<", ">=", "<=", "~",
            "CONTAINS", "STARTSWITH", "ENDSWITH", "IN", "NOT IN", "BETWEEN", "IS EMPTY", "IS NOT EMPTY",
            "WAS", "CHANGED"));
        out.put("connectors", List.of("AND", "OR", "NOT"));
        out.put("functions", List.of("currentUser()", "today()", "now()", "startOfWeek()",
            "endOfWeek()", "startOfMonth()", "endOfMonth()", "startOfQuarter()", "endOfQuarter()",
            "startOfYear()", "endOfYear()", "startOfDay()", "endOfDay()", "daysAgo(n)", "daysFromNow(n)"));
        out.put("enums", enumSuggestions(wsId));
        out.put("sortable", SORTABLE);
        out.put("groupable", GROUPABLE);
        return out;
    }

    // Saved queries are now Saved Views (/api/v1/saved-views) — the legacy bql_filter
    // endpoints were removed and the table dropped in V83 (consolidation, #250).

    // ── helpers ───────────────────────────────────────────────────────────────────

    /** Resolve + authorize the workspace: an explicit one must be a workspace the user belongs to. */
    private String resolveWorkspace(String userId, String requested) {
        if (requested != null && !requested.isBlank()) {
            if (!rbac.canView(userId, requested)) {
                throw ApiException.forbidden("You are not a member of this workspace.");
            }
            return requested;
        }
        String defaultWorkspace = getDefaultWorkspaceForUser(userId);
        if (defaultWorkspace == null) {
            throw ApiException.forbidden("You are not a member of this workspace.");
        }
        return defaultWorkspace;
    }

    private BqlContext contextFor(String userId, String workspaceId) {
        return contextFactory.forUser(userId, workspaceId);
    }

    /** Page size, clamped to [1, 500]; default 100. */
    private int clampSize(String raw) {
        int size = parseIntOr(raw, 100);
        return Math.max(1, Math.min(size, 500));
    }

    /** Zero-based page → row offset (non-negative). */
    private int pageOffset(String rawPage, int size) {
        int page = Math.max(0, parseIntOr(rawPage, 0));
        return page * size;
    }

    private int parseIntOr(String raw, int fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    /**
     * Validate a sort spec against the allow-list; default to newest first. Accepts one or more
     * comma-separated {@code field [ASC|DESC]} terms; field aliases (e.g. {@code dueDate}) resolve
     * to columns and each must be in {@link #SORTABLE}. Invalid terms are dropped.
     */
    private String orderBy(String sort) {
        if (sort == null || sort.isBlank()) {
            return "created_at DESC";
        }
        List<String> terms = new ArrayList<>();
        for (String term : sort.split(",")) {
            String[] parts = term.trim().split("\\s+");
            if (parts.length == 0 || parts[0].isBlank()) {
                continue;
            }
            String alias = parts[0].toLowerCase(Locale.ROOT);
            String col = BqlFieldRegistry.columnForAlias(alias);
            if (col == null) {
                col = alias; // allow a raw column name too
            }
            if (!SORTABLE.contains(col)) {
                continue;
            }
            boolean asc = parts.length > 1 && parts[1].equalsIgnoreCase("asc");
            terms.add(col + (asc ? " ASC" : " DESC"));
        }
        return terms.isEmpty() ? "created_at DESC" : String.join(", ", terms);
    }

    /**
     * Resolve a {@code groupBy} alias to a real, group-safe column. Aliases (e.g. {@code assignee})
     * resolve through the allow-list to their column; the column must be in {@link #GROUPABLE}.
     * Anything else is rejected so the GROUP BY target can never be attacker-controlled.
     */
    private String resolveGroupBy(String groupBy) {
        if (groupBy == null || groupBy.isBlank()) {
            throw ApiException.badRequest("GROUP_BY_REQUIRED", "A groupBy field is required.");
        }
        String col = BqlFieldRegistry.columnForAlias(groupBy.trim().toLowerCase(Locale.ROOT));
        if (col == null) {
            col = groupBy.trim().toLowerCase(Locale.ROOT); // allow a raw column name too
        }
        if (!GROUPABLE.contains(col)) {
            throw ApiException.badRequest("GROUP_BY_INVALID", "Cannot group by '" + groupBy + "'.");
        }
        return col;
    }

    /** Pull the {@code ORDER BY …} tail (if any) out of a query and normalise it to a sort spec. */
    private String extractInlineOrderBy(String query) {
        java.util.regex.Matcher m = ORDER_BY.matcher(query);
        return m.find() ? orderBy(m.group(1)) : null;
    }

    /** Strip a trailing {@code ORDER BY …} so the WHERE compiler only sees the predicate. */
    private String stripOrderBy(String query) {
        return ORDER_BY.matcher(query).replaceAll("").trim();
    }

    private Map<String, List<String>> enumSuggestions(String workspaceId) {
        Map<String, List<String>> enums = new LinkedHashMap<>();
        enums.put("priority", distinct("priority", workspaceId));
        enums.put("status", distinct("status", workspaceId));
        enums.put("type", distinct("type", workspaceId));
        return enums;
    }

    private List<String> distinct(String column, String workspaceId) {
        try {
            return jdbc.queryForList(
                "SELECT DISTINCT " + column + " FROM work_items"
                + " WHERE deleted_at IS NULL AND " + column + " IS NOT NULL"
                + " AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)"
                + " ORDER BY " + column + " LIMIT 50",
                String.class, workspaceId);
        } catch (Exception e) {
            return List.of();
        }
    }

    private String getDefaultWorkspaceForUser(String userId) {
        try {
            return jdbc.queryForObject(
                "SELECT workspace_id FROM workspace_members WHERE user_id = ? ORDER BY workspace_id LIMIT 1",
                String.class, userId);
        } catch (Exception e) {
            return null;
        }
    }
}
