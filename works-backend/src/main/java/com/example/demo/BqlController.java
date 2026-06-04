package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.*;
import jakarta.validation.Valid;

/**
 * BQL — bSmart Query Language
 * Composable filter syntax: field operator value [AND/OR ...]
 * Examples:
 *   priority = Highest AND assignee = currentUser()
 *   status != Done AND type = Bug
 *   dueDate &lt; today() AND priority IN (High, Highest)
 *
 * Parsing/compilation lives in {@link BqlCompiler}, which emits parameterized SQL; this
 * controller stays thin — it runs the compiled query and manages saved filters.
 */
@RestController
@RequestMapping("/api/v1/bql")
public class BqlController {

    private static final String BASE_SELECT =
        "SELECT id, title, status, type, priority, assignee_id, project_id, due_date, created_at "
        + "FROM work_items WHERE deleted_at IS NULL";

    private final JdbcTemplate jdbc;
    private final BqlCompiler compiler;
    private final BqlFilterRepository filterRepo;
    private final AuthenticatedUser authenticatedUser;

    public BqlController(JdbcTemplate jdbc,
                         BqlCompiler compiler,
                         BqlFilterRepository filterRepo,
                         AuthenticatedUser authenticatedUser) {
        this.jdbc = jdbc;
        this.compiler = compiler;
        this.filterRepo = filterRepo;
        this.authenticatedUser = authenticatedUser;
    }

    @PostMapping("/execute")
    public List<Map<String, Object>> execute(@Valid @RequestBody Map<String, String> body) {
        String query = body.getOrDefault("query", "").trim();
        String userId = authenticatedUser.id();
        if (query.isEmpty()) {
            return jdbc.queryForList(BASE_SELECT + " ORDER BY created_at DESC LIMIT 100");
        }
        try {
            BqlCompiler.Compiled c = compiler.compile(query, userId);
            String sql = BASE_SELECT
                + (c.sql().isEmpty() ? "" : " AND (" + c.sql() + ")")
                + " ORDER BY created_at DESC LIMIT 500";
            return jdbc.queryForList(sql, c.params().toArray());
        } catch (BqlException e) {
            throw new IllegalArgumentException("BQL parse error: " + e.getMessage());
        }
    }

    @PostMapping("/validate")
    public Map<String, Object> validate(@Valid @RequestBody Map<String, String> body) {
        String query = body.getOrDefault("query", "").trim();
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            compiler.compile(query, "validate");
            result.put("valid", true);
        } catch (BqlException e) {
            result.put("valid", false);
            result.put("error", e.getMessage());
        }
        return result;
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
        for (BqlFilter f : mine) { ids.add(f.getId()); combined.add(f); }
        for (BqlFilter f : shared) { if (!ids.contains(f.getId())) combined.add(f); }
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
        filterRepo.deleteById(id);
        return Map.of("message", "Filter deleted");
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
