package com.bcits.works;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
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

    private static final String SELECT_COLUMNS =
        "id, title, status, type, priority, assignee_id, project_id, due_date, created_at";

    /** Sort fields a user may order by — resolved through the same allow-list, defends ORDER BY. */
    private static final Set<String> SORTABLE = Set.of(
        "created_at", "updated_at", "due_date", "priority", "status", "story_points", "title");

    /** Tier at/above which leadership-sensitive fields (e.g. businessValue) are queryable. */
    private static final int SENSITIVE_FIELD_MIN_TIER = 3; // LEAD+

    private final JdbcTemplate jdbc;
    private final BqlCompiler compiler;
    private final BqlFilterRepository filterRepo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacService rbac;

    public BqlController(JdbcTemplate jdbc,
                         BqlCompiler compiler,
                         BqlFilterRepository filterRepo,
                         AuthenticatedUser authenticatedUser,
                         RbacService rbac) {
        this.jdbc = jdbc;
        this.compiler = compiler;
        this.filterRepo = filterRepo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @PostMapping("/execute")
    public List<Map<String, Object>> execute(@Valid @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        String workspaceId = resolveWorkspace(userId, body.get("workspaceId"));
        String query = body.getOrDefault("query", "").trim();
        String sort = orderBy(body.get("sort"));

        // Hard workspace scope: work_items has no workspace_id — scope via projects (RB-40 §1).
        String base = "SELECT " + SELECT_COLUMNS + " FROM work_items"
            + " WHERE deleted_at IS NULL"
            + " AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)";
        List<Object> params = new ArrayList<>();
        params.add(workspaceId);

        try {
            BqlCompiler.Compiled c = compiler.compileFor(query, contextFor(userId, workspaceId));
            String sql = base
                + (c.sql().isEmpty() ? "" : " AND (" + c.sql() + ")")
                + " ORDER BY " + sort + " LIMIT 500";
            params.addAll(c.params());
            return jdbc.queryForList(sql, params.toArray());
        } catch (BqlException e) {
            throw new IllegalArgumentException("BQL parse error: " + e.getMessage());
        }
    }

    @PostMapping("/validate")
    public Map<String, Object> validate(@Valid @RequestBody Map<String, String> body) {
        String userId = authenticatedUser.id();
        String workspaceId = resolveWorkspace(userId, body.get("workspaceId"));
        String query = body.getOrDefault("query", "").trim();
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            compiler.compileFor(query, contextFor(userId, workspaceId));
            result.put("valid", true);
        } catch (BqlException e) {
            result.put("valid", false);
            result.put("error", e.getMessage());
        }
        return result;
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
            fields.add(m);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("fields", fields);
        out.put("operators", List.of("=", "!=", ">", "<", ">=", "<=",
            "CONTAINS", "STARTSWITH", "ENDSWITH", "IN", "NOT IN", "BETWEEN", "IS EMPTY", "IS NOT EMPTY"));
        out.put("connectors", List.of("AND", "OR", "NOT"));
        out.put("functions", List.of("currentUser()", "today()", "now()", "startOfWeek()",
            "endOfWeek()", "startOfMonth()", "endOfMonth()", "daysAgo(n)", "daysFromNow(n)"));
        out.put("enums", enumSuggestions(wsId));
        return out;
    }

    // Saved BQL filters
    @GetMapping("/filters")
    public List<BqlFilter> listFilters() {
        String userId = authenticatedUser.id();
        String workspaceId = getWorkspaceForUser(userId);
        List<BqlFilter> mine = filterRepo.findByWorkspaceIdAndCreatedBy(workspaceId, userId);
        List<BqlFilter> shared = filterRepo.findByWorkspaceIdAndIsSharedTrue(workspaceId);
        Set<String> ids = new HashSet<>();
        List<BqlFilter> combined = new ArrayList<>();
        for (BqlFilter f : mine) {
            ids.add(f.getId());
            combined.add(f);
        }
        for (BqlFilter f : shared) {
            if (!ids.contains(f.getId())) { combined.add(f); }
        }
        return combined;
    }

    @PostMapping("/filters")
    public BqlFilter saveFilter(@Valid @RequestBody BqlFilter filter) {
        String userId = authenticatedUser.id();
        filter.setId("BQL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        filter.setCreatedBy(userId);
        filter.setWorkspaceId(getWorkspaceForUser(userId));
        filter.setCreatedAt(OffsetDateTime.now());
        return filterRepo.save(filter);
    }

    @DeleteMapping("/filters/{id}")
    public Map<String, String> deleteFilter(@PathVariable String id) {
        String userId = authenticatedUser.id();
        String workspaceId = getWorkspaceForUser(userId);
        // A user can only delete a filter in their own workspace (cross-tenant guard).
        BqlFilter existing = filterRepo.findById(id).orElse(null);
        if (existing == null || !workspaceId.equals(existing.getWorkspaceId())) {
            throw ApiException.forbidden("Filter not found in this workspace.");
        }
        filterRepo.deleteById(id);
        return Map.of("message", "Filter deleted");
    }

    // ── helpers ───────────────────────────────────────────────────────────────────

    /** Resolve + authorize the workspace: an explicit one must be a workspace the user belongs to. */
    private String resolveWorkspace(String userId, String requested) {
        String own = getWorkspaceForUser(userId);
        if (requested == null || requested.isBlank()) {
            return own;
        }
        if (!rbac.canView(userId, requested)) {
            throw ApiException.forbidden("You are not a member of this workspace.");
        }
        return requested;
    }

    private BqlContext contextFor(String userId, String workspaceId) {
        boolean canSeeSensitive = rbac.getUserTier(userId, workspaceId) >= SENSITIVE_FIELD_MIN_TIER;
        return BqlContext.forUser(userId, canSeeSensitive);
    }

    /** Validate the requested sort against the allow-list; default to newest first. */
    private String orderBy(String sort) {
        if (sort == null || sort.isBlank()) {
            return "created_at DESC";
        }
        String[] parts = sort.trim().split("\\s+");
        String col = parts[0].toLowerCase(Locale.ROOT);
        if (!SORTABLE.contains(col)) {
            return "created_at DESC";
        }
        boolean asc = parts.length > 1 && parts[1].equalsIgnoreCase("asc");
        return col + (asc ? " ASC" : " DESC");
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

    private String getWorkspaceForUser(String userId) {
        try {
            return jdbc.queryForObject(
                "SELECT workspace_id FROM users WHERE id = ?", String.class, userId);
        } catch (Exception e) {
            return "WS-001";
        }
    }
}
