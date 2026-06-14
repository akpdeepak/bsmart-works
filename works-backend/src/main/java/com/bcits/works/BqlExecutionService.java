package com.bcits.works;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * The one place a user-facing BQL query is turned into a workspace-scoped, parameterized SQL run
 * against {@code work_items}. Centralising it here (rather than re-typing the scope predicate per
 * caller) is what makes the tenant guarantee hold — RB-40 §1: "scoping applied centrally, not
 * re-typed per query." The BQL endpoint, the saved-view run, and the subscription scheduler all go
 * through this, so none of them can forget the {@code workspace_id} predicate.
 *
 * <p>Field-level security is carried by the {@link BqlContext} the caller supplies; the WHERE
 * fragment + binds come from {@link BqlCompiler}. Callers pass an already-validated {@code sort}
 * (allow-listed columns only) and clamped paging — this service never interpolates user input as
 * SQL syntax beyond that contract.
 */
@Service
public class BqlExecutionService {

    /** Columns the navigator can show — the selectable set behind the column chooser. */
    public static final String SELECT_COLUMNS =
        "id, title, status, type, priority, assignee_id, created_by, project_id, sprint_id, "
        + "story_points, due_date, created_at, updated_at";

    // work_items has no workspace_id — scope via its project's workspace (RB-40 §1).
    private static final String SCOPE =
        "deleted_at IS NULL AND project_id IN (SELECT id FROM projects WHERE workspace_id = ?)";

    private final JdbcTemplate jdbc;
    private final BqlCompiler compiler;

    public BqlExecutionService(JdbcTemplate jdbc, BqlCompiler compiler) {
        this.jdbc = jdbc;
        this.compiler = compiler;
    }

    /**
     * Run a workspace-scoped query and return the matching rows.
     *
     * @param sort an already-validated ORDER BY clause (e.g. {@code "created_at DESC"})
     * @throws BqlException if the query cannot be compiled
     */
    public List<Map<String, Object>> execute(String workspaceId, BqlContext ctx, String query,
                                             String sort, int size, int offset) {
        Scoped s = scoped(workspaceId, ctx, query);
        String sql = "SELECT " + SELECT_COLUMNS + " FROM work_items WHERE " + s.where
            + " ORDER BY " + sort + " LIMIT " + size + " OFFSET " + offset;
        return jdbc.queryForList(sql, s.params.toArray());
    }

    /**
     * Count the matches for a workspace-scoped query — used by the audit log and subscriptions,
     * which care how many rows a named query currently matches, not the rows themselves.
     *
     * @throws BqlException if the query cannot be compiled
     */
    public int count(String workspaceId, BqlContext ctx, String query) {
        Scoped s = scoped(workspaceId, ctx, query);
        Integer n = jdbc.queryForObject(
            "SELECT COUNT(*) FROM work_items WHERE " + s.where, Integer.class, s.params.toArray());
        return n == null ? 0 : n;
    }

    private Scoped scoped(String workspaceId, BqlContext ctx, String query) {
        List<Object> params = new ArrayList<>();
        params.add(workspaceId);
        StringBuilder where = new StringBuilder(SCOPE);
        BqlCompiler.Compiled c = compiler.compileFor(query, ctx);
        if (!c.sql().isEmpty()) {
            where.append(" AND (").append(c.sql()).append(')');
            params.addAll(c.params());
        }
        return new Scoped(where.toString(), params);
    }

    private record Scoped(String where, List<Object> params) { }
}
